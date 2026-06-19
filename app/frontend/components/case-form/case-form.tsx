"use client";

import { FormEvent, ReactNode, useState } from "react";
import {
  createSession,
  type ApiFieldErrors,
  type CreateSessionInput,
  type EquipmentCategory,
  type RequestType,
  type SessionResponse
} from "@/lib/api/sessions";

type CaseFormProps = {
  submitSession?: (input: CreateSessionInput) => Promise<SessionResponse>;
  onCreated?: (session: SessionResponse) => void;
};

type FormErrors = ApiFieldErrors & {
  form?: string;
};

const categoryOptions: Array<{ value: EquipmentCategory; label: string }> = [
  { value: "laptop", label: "Laptop" },
  { value: "desktop_pc", label: "Komputer stacjonarny" },
  { value: "smartphone", label: "Smartfon" },
  { value: "tablet", label: "Tablet" },
  { value: "monitor", label: "Monitor" },
  { value: "tv", label: "Telewizor" },
  { value: "printer", label: "Drukarka" },
  { value: "headphones", label: "Słuchawki" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "gaming_console", label: "Konsola do gier" },
  { value: "computer_accessory", label: "Akcesorium komputerowe" },
  { value: "other_electronics", label: "Inna elektronika" }
];

export function CaseForm({
  submitSession = createSession,
  onCreated
}: CaseFormProps) {
  const [requestType, setRequestType] = useState<RequestType>("complaint");
  const [equipmentCategory, setEquipmentCategory] =
    useState<EquipmentCategory>("laptop");
  const [equipmentNameOrModel, setEquipmentNameOrModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [reason, setReason] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, setIsPending] = useState(false);

  function handleImageChange(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length > 1) {
      setImage(null);
      setErrors((current) => ({
        ...current,
        image: "Dodaj tylko jedno zdjęcie sprzętu."
      }));
      return;
    }

    setImage(selectedFiles[0] ?? null);
    setErrors((current) => ({ ...current, image: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.values(validationErrors).some(Boolean) || !image) {
      return;
    }

    setIsPending(true);

    try {
      const session = await submitSession({
        requestType,
        equipmentCategory,
        equipmentNameOrModel: equipmentNameOrModel.trim(),
        purchaseDate,
        reason: reason.trim(),
        image
      });
      onCreated?.(session);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setIsPending(false);
    }
  }

  function validateForm(): FormErrors {
    return {
      equipmentNameOrModel: equipmentNameOrModel.trim()
        ? undefined
        : "Podaj nazwę lub model sprzętu.",
      purchaseDate: purchaseDate ? undefined : "Podaj datę zakupu.",
      reason:
        requestType === "complaint" && !reason.trim()
          ? "Podaj powód reklamacji."
          : undefined,
      image: image ? undefined : "Dodaj jedno zdjęcie sprzętu."
    };
  }

  return (
    <form className="grid gap-4 p-4" onSubmit={handleSubmit} noValidate>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Typ sprawy</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={typeOptionClass(requestType === "complaint")}>
            <input
              checked={requestType === "complaint"}
              className="sr-only"
              name="requestType"
              onChange={() => setRequestType("complaint")}
              type="radio"
            />
            Reklamacja
          </label>
          <label className={typeOptionClass(requestType === "return")}>
            <input
              checked={requestType === "return"}
              className="sr-only"
              name="requestType"
              onChange={() => setRequestType("return")}
              type="radio"
            />
            Zwrot
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kategoria sprzętu" targetId="equipmentCategory">
          <select
            className={inputClass()}
            id="equipmentCategory"
            onChange={(event) =>
              setEquipmentCategory(event.target.value as EquipmentCategory)
            }
            value={equipmentCategory}
          >
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          error={errors.equipmentNameOrModel}
          label="Model lub nazwa sprzętu"
          targetId="equipmentNameOrModel"
        >
          <input
            aria-invalid={Boolean(errors.equipmentNameOrModel)}
            className={inputClass(Boolean(errors.equipmentNameOrModel))}
            id="equipmentNameOrModel"
            onChange={(event) => setEquipmentNameOrModel(event.target.value)}
            placeholder="np. ThinkPad T14"
            type="text"
            value={equipmentNameOrModel}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          error={errors.purchaseDate}
          label="Data zakupu"
          targetId="purchaseDate"
        >
          <input
            aria-invalid={Boolean(errors.purchaseDate)}
            className={inputClass(Boolean(errors.purchaseDate))}
            id="purchaseDate"
            onChange={(event) => setPurchaseDate(event.target.value)}
            type="date"
            value={purchaseDate}
          />
        </Field>

        <Field error={errors.reason} label="Powód zgłoszenia" targetId="reason">
          <textarea
            aria-invalid={Boolean(errors.reason)}
            className={`${inputClass(Boolean(errors.reason))} min-h-24 resize-y`}
            id="reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              requestType === "complaint"
                ? "Opisz usterkę lub problem"
                : "Opcjonalnie opisz powód zwrotu"
            }
            value={reason}
          />
        </Field>
      </div>

      <Field error={errors.image} label="Zdjęcie sprzętu" targetId="image">
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={Boolean(errors.image)}
          className={inputClass(Boolean(errors.image))}
          id="image"
          onChange={(event) => handleImageChange(event.target.files)}
          type="file"
        />
      </Field>

      {errors.form ? (
        <p className="rounded-md border border-danger bg-subtle px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          className="min-h-[43px] rounded-md bg-success px-5 py-2 text-base leading-6 text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Wysyłanie..." : "Wyślij zgłoszenie"}
        </button>
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  label,
  targetId
}: {
  children: ReactNode;
  error?: string;
  label: string;
  targetId: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" htmlFor={targetId}>
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError = false) {
  return [
    "rounded-md border bg-canvas px-3 py-2 font-normal text-foreground",
    hasError ? "border-danger" : "border-borderDefault"
  ].join(" ");
}

function typeOptionClass(isSelected: boolean) {
  return [
    "flex min-h-[43px] cursor-pointer items-center justify-center rounded-md border px-5 py-2 text-base leading-6",
    isSelected
      ? "border-transparent bg-success text-white"
      : "border-borderDefault bg-subtle text-foreground"
  ].join(" ");
}

function toFormErrors(error: unknown): FormErrors {
  if (
    typeof error === "object" &&
    error !== null &&
    "fieldErrors" in error &&
    typeof error.fieldErrors === "object" &&
    error.fieldErrors !== null
  ) {
    return error.fieldErrors as ApiFieldErrors;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "messagePl" in error &&
    typeof error.messagePl === "string"
  ) {
    return { form: error.messagePl };
  }

  return { form: "Nie udało się wysłać zgłoszenia." };
}
