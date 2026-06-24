"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EQUIPMENT_CATEGORIES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  type EquipmentCategory,
  type RequestType
} from "@/shared/contracts";

import styles from "./IntakeForm.module.css";

export type IntakeFormValues = {
  requestType: RequestType | "";
  equipmentCategory: EquipmentCategory | "";
  equipmentName: string;
  purchaseDate: string;
  reason: string;
  image: File | null;
};

export type IntakeFormErrors = Partial<Record<keyof IntakeFormValues, string>>;

type IntakeFormProps = {
  initialValues: IntakeFormValues;
  locked?: boolean;
  onSubmit: (values: IntakeFormValues) => void;
};

const acceptedImageTypes = new Set<string>(IMAGE_MIME_TYPES);

const initialTouched: Record<keyof IntakeFormValues, boolean> = {
  requestType: false,
  equipmentCategory: false,
  equipmentName: false,
  purchaseDate: false,
  reason: false,
  image: false
};

export const emptyIntakeFormValues = (): IntakeFormValues => ({
  requestType: "",
  equipmentCategory: "",
  equipmentName: "",
  purchaseDate: "",
  reason: "",
  image: null
});

export function IntakeForm({ initialValues, locked = false, onSubmit }: IntakeFormProps) {
  const [values, setValues] = useState<IntakeFormValues>(initialValues);
  const [touched, setTouched] = useState(initialTouched);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstInvalidRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);

  const errors = useMemo(() => validateIntake(values), [values]);
  const isValid = Object.keys(errors).length === 0;
  const visibleErrors = getVisibleErrors(errors, touched, showAllErrors);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateValue = <Key extends keyof IntakeFormValues>(key: Key, value: IntakeFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const handleFileChange = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    updateValue("image", file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    updateValue("image", null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowAllErrors(true);

    if (!isValid) {
      firstInvalidRef.current?.focus();
      return;
    }

    onSubmit(values);
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <fieldset className={styles.fieldset} disabled={locked}>
        <legend>Typ zgłoszenia</legend>
        <div className={styles.typeOptions}>
          <label className={styles.typeOption}>
            <input
              checked={values.requestType === "COMPLAINT"}
              name="requestType"
              onChange={() => updateValue("requestType", "COMPLAINT")}
              ref={(element) => {
                if (errors.requestType) {
                  firstInvalidRef.current ??= element;
                }
              }}
              type="radio"
              value="COMPLAINT"
            />
            <span>Reklamacja</span>
          </label>
          <label className={styles.typeOption}>
            <input
              checked={values.requestType === "RETURN"}
              name="requestType"
              onChange={() => updateValue("requestType", "RETURN")}
              type="radio"
              value="RETURN"
            />
            <span>Zwrot</span>
          </label>
        </div>
        <FieldError message={visibleErrors.requestType} />
      </fieldset>

      <FormField
        error={visibleErrors.equipmentCategory}
        helper="Wybierz jedną z kategorii z listy."
        label="Kategoria sprzętu"
      >
        <select
          aria-invalid={Boolean(visibleErrors.equipmentCategory)}
          onBlur={() => setTouched((current) => ({ ...current, equipmentCategory: true }))}
          onChange={(event) =>
            updateValue("equipmentCategory", event.target.value as EquipmentCategory | "")
          }
          ref={(element) => {
            if (!firstInvalidRef.current && errors.equipmentCategory) {
              firstInvalidRef.current = element;
            }
          }}
          value={values.equipmentCategory}
          disabled={locked}
        >
          <option value="">Wybierz kategorię</option>
          {EQUIPMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        error={visibleErrors.equipmentName}
        helper="Podaj nazwę produktu albo model z opakowania."
        label="Nazwa lub model sprzętu"
      >
        <input
          aria-invalid={Boolean(visibleErrors.equipmentName)}
          disabled={locked}
          onBlur={() => setTouched((current) => ({ ...current, equipmentName: true }))}
          onChange={(event) => updateValue("equipmentName", event.target.value)}
          ref={(element) => {
            if (!firstInvalidRef.current && errors.equipmentName) {
              firstInvalidRef.current = element;
            }
          }}
          type="text"
          value={values.equipmentName}
        />
      </FormField>

      <FormField
        error={visibleErrors.purchaseDate}
        helper="Data nie może być późniejsza niż dzisiaj."
        label="Data zakupu"
      >
        <input
          aria-invalid={Boolean(visibleErrors.purchaseDate)}
          disabled={locked}
          max={getTodayIso()}
          onBlur={() => setTouched((current) => ({ ...current, purchaseDate: true }))}
          onChange={(event) => updateValue("purchaseDate", event.target.value)}
          ref={(element) => {
            if (!firstInvalidRef.current && errors.purchaseDate) {
              firstInvalidRef.current = element;
            }
          }}
          type="date"
          value={values.purchaseDate}
        />
      </FormField>

      <FormField
        error={visibleErrors.reason}
        helper={
          values.requestType === "COMPLAINT"
            ? "Opisz usterkę, objawy i moment ich zauważenia."
            : "Możesz dopisać kontekst, ale przy zwrocie nie jest wymagany."
        }
        label={values.requestType === "COMPLAINT" ? "Powód reklamacji (wymagane)" : "Powód zwrotu (opcjonalne)"}
      >
        <textarea
          aria-invalid={Boolean(visibleErrors.reason)}
          disabled={locked}
          onBlur={() => setTouched((current) => ({ ...current, reason: true }))}
          onChange={(event) => updateValue("reason", event.target.value)}
          ref={(element) => {
            if (!firstInvalidRef.current && errors.reason) {
              firstInvalidRef.current = element;
            }
          }}
          rows={4}
          value={values.reason}
        />
      </FormField>

      <FormField
        error={visibleErrors.image}
        helper="Dodaj jedno zdjęcie w formacie JPEG, PNG albo WebP. Maksymalny rozmiar: 10 MB."
        label="Zdjęcie sprzętu"
      >
        <input
          accept={IMAGE_MIME_TYPES.join(",")}
          aria-invalid={Boolean(visibleErrors.image)}
          disabled={locked}
          onChange={(event) => handleFileChange(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </FormField>

      {values.image ? (
        <div className={styles.preview}>
          {previewUrl ? (
            <Image
              alt="Podgląd zdjęcia sprzętu"
              height={96}
              src={previewUrl}
              unoptimized
              width={128}
            />
          ) : null}
          <div>
            <p>{values.image.name}</p>
            <span>{formatFileSize(values.image.size)}</span>
          </div>
          <button disabled={locked} onClick={handleRemoveImage} type="button">
            Usuń zdjęcie
          </button>
        </div>
      ) : null}

      <button className={styles.submit} disabled={locked || !isValid} type="submit">
        {locked ? "Przetwarzamy..." : "Przygotuj ocenę"}
      </button>
    </form>
  );
}

function FormField({
  children,
  error,
  helper,
  label
}: {
  children: React.ReactNode;
  error?: string;
  helper: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      <small>{helper}</small>
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}

function getVisibleErrors(
  errors: IntakeFormErrors,
  touched: Record<keyof IntakeFormValues, boolean>,
  showAllErrors: boolean
) {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field]) => field === "image" || showAllErrors || touched[field as keyof IntakeFormValues]
    )
  ) as IntakeFormErrors;
}

export function validateIntake(values: IntakeFormValues): IntakeFormErrors {
  const errors: IntakeFormErrors = {};

  if (!values.requestType) {
    errors.requestType = "Wybierz typ zgłoszenia.";
  }

  if (!values.equipmentCategory) {
    errors.equipmentCategory = "Wybierz kategorię sprzętu z listy.";
  }

  if (values.equipmentName.trim().length === 0) {
    errors.equipmentName = "Podaj nazwę lub model sprzętu.";
  }

  if (!values.purchaseDate) {
    errors.purchaseDate = "Podaj datę zakupu.";
  } else if (values.purchaseDate > getTodayIso()) {
    errors.purchaseDate = "Data zakupu nie może być z przyszłości.";
  }

  if (values.requestType === "COMPLAINT" && values.reason.trim().length === 0) {
    errors.reason = "Opisz powód reklamacji.";
  }

  if (!values.image) {
    errors.image = "Dodaj dokładnie jedno zdjęcie sprzętu.";
  } else if (!acceptedImageTypes.has(values.image.type)) {
    errors.image = "Zdjęcie musi być w formacie JPEG, PNG albo WebP.";
  } else if (values.image.size > IMAGE_MAX_SIZE_BYTES) {
    errors.image = "Zdjęcie może mieć maksymalnie 10 MB.";
  }

  return errors;
}

export function buildAssessmentFormData(values: IntakeFormValues) {
  const formData = new FormData();
  formData.set("requestType", values.requestType);
  formData.set("equipmentCategory", values.equipmentCategory);
  formData.set("equipmentName", values.equipmentName);
  formData.set("purchaseDate", values.purchaseDate);
  formData.set("reason", values.reason);

  if (values.image) {
    formData.set("image", values.image);
  }

  return formData;
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatFileSize(sizeBytes: number) {
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
}
