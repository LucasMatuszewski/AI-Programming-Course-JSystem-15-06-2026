import type { DecisionCardMessage } from "./types";
import styles from "./AssessmentFlow.module.css";

const outcomeLabels: Record<DecisionCardMessage["card"]["outcome"], string> = {
  APPROVE: "Prawdopodobnie zaakceptowane",
  REJECT: "Prawdopodobnie odrzucone",
  NEEDS_MORE_INFO: "Potrzebne dodatkowe informacje",
  CONDITIONAL: "Warunkowo zaakceptowane",
  ESCALATE: "Do weryfikacji przez zespół"
};

const outcomeClasses: Record<DecisionCardMessage["card"]["outcome"], string> = {
  APPROVE: styles.approve,
  REJECT: styles.reject,
  NEEDS_MORE_INFO: styles.needsMoreInfo,
  CONDITIONAL: styles.conditional,
  ESCALATE: styles.escalate
};

type DecisionCardProps = {
  message: DecisionCardMessage;
};

export function DecisionCard({ message }: DecisionCardProps) {
  const { card } = message;

  return (
    <article className={styles.card} aria-labelledby="decision-title" data-testid="decision-card">
      <p>{card.greeting}</p>
      <div className={styles.heading}>
        <span className={`${styles.status} ${outcomeClasses[card.outcome]}`}>
          {outcomeLabels[card.outcome]}
        </span>
        <h3 id="decision-title">{card.title}</h3>
      </div>

      <section aria-labelledby="decision-justification">
        <h4 id="decision-justification">Uzasadnienie</h4>
        <p>{card.justification}</p>
      </section>

      {card.policyReferences.length > 0 ? (
        <section aria-labelledby="decision-policy">
          <h4 id="decision-policy">Podstawa oceny</h4>
          <ul>
            {card.policyReferences.map((reference) => (
              <li key={reference}>{reference}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="decision-next-steps">
        <h4 id="decision-next-steps">Następne kroki</h4>
        {card.nextSteps.length > 0 ? (
          <ul>
            {card.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : (
          <p>Brak dodatkowych kroków.</p>
        )}
      </section>

      {card.missingInformation.length > 0 ? (
        <section aria-labelledby="decision-missing">
          <h4 id="decision-missing">Brakujące informacje</h4>
          <ul>
            {card.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className={styles.disclaimer} data-testid="decision-disclaimer">
        {card.disclaimer}
      </p>
    </article>
  );
}
