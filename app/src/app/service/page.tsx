import { LoginPanel, ServiceDashboard } from "@/components/service/service-panel";

export default function ServicePage() {
  return (
    <ServiceDashboard
      claims={[
        {
          id: "demo",
          brand: "Demo",
          model: "Rower",
          status: "submitted",
          damageType: "unknown",
          problemDescription:
            "Po zalogowaniu panel pobierze zgłoszenia z API obsługi.",
          damageCircumstances:
            "To jest widok demonstracyjny do czasu podłączenia sesji w UI.",
          latestAssessment: null,
        },
      ]}
    />
  );
}

export { LoginPanel };
