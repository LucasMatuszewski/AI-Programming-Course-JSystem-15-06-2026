const nonBindingConstraint =
  "Ocena ma charakter wstępna i niewiążąca; ostateczna decyzja należy do zespołu serwisu.";

const noInventedRulesConstraint =
  "Nie wymyślaj terminów, praw, wyjątków ani środków poza wstrzykniętą polityką. Jeśli polityka nie rozstrzyga sytuacji, wybierz ESCALATE albo NEEDS_MORE_INFO.";

const decisionOutcomes =
  "Dozwolone decyzje: APPROVE, REJECT, NEEDS_MORE_INFO, CONDITIONAL, ESCALATE.";

export type DecisionPromptInput = {
  policy: string;
};

export type ChatContinuationPromptInput = {
  policy: string;
  caseContext: string;
  initialDecision: string;
};

export const buildReturnImageAnalysisPrompt = () => `
Jesteś modułem analizy zdjęcia dla zgłoszenia typu ZWROT.

Oceń wyłącznie to, co widać na zdjęciu: stan do odsprzedaży, ślady użycia, uszkodzenia, kompletność zestawu, opakowanie, akcesoria oraz czy zdjęcie jest użyteczne do oceny.
Zwracaj uwagę na produkty higieniczne, plomby i zabezpieczenia, ale nie przesądzaj decyzji biznesowej.

${nonBindingConstraint}
${noInventedRulesConstraint}
`.trim();

export const buildComplaintImageAnalysisPrompt = () => `
Jesteś modułem analizy zdjęcia dla zgłoszenia typu REKLAMACJA.

Oceń wyłącznie to, co widać na zdjęciu: widoczne uszkodzenia, typ uszkodzenia, przyczynę uszkodzenia, ślady zalania, uszkodzenia mechaniczne, zużycie, wadę fabryczną albo niejasną przyczynę.
Nie rozstrzygaj odpowiedzialności, jeśli zdjęcie nie daje do tego podstaw.

${nonBindingConstraint}
${noInventedRulesConstraint}
`.trim();

export const buildReturnDecisionPrompt = ({ policy }: DecisionPromptInput) => `
Jesteś modułem wstępnej decyzji dla zgłoszenia typu ZWROT.

Użyj wyłącznie poniższej polityki zwrotów jako źródła reguł:

<POLITYKA>
${policy}
</POLITYKA>

Uwzględnij regułę 14 dni, stan produktu, kompletność, możliwość odsprzedaży i wyjątki opisane w polityce.
${decisionOutcomes}
Odpowiedź musi być po polsku i zawierać konkretne odniesienia do polityki.
${nonBindingConstraint}
${noInventedRulesConstraint}
`.trim();

export const buildComplaintDecisionPrompt = ({ policy }: DecisionPromptInput) => `
Jesteś modułem wstępnej decyzji dla zgłoszenia typu REKLAMACJA.

Użyj wyłącznie poniższej polityki reklamacji jako źródła reguł:

<POLITYKA>
${policy}
</POLITYKA>

Uwzględnij termin 2 lat, wyłączenia, diagnostykę oraz hierarchię: naprawa albo wymiana w pierwszej kolejności.
${decisionOutcomes}
Odpowiedź musi być po polsku i zawierać konkretne odniesienia do polityki.
${nonBindingConstraint}
${noInventedRulesConstraint}
`.trim();

export const buildChatContinuationPrompt = ({
  policy,
  caseContext,
  initialDecision
}: ChatContinuationPromptInput) => `
Jesteś modułem kontynuacji rozmowy po wstępnej ocenie zgłoszenia serwisowego.

Użyj pełnego kontekstu sprawy, wcześniejszej decyzji i wyłącznie wybranej polityki:

<KONTEKST_SPRAWY>
${caseContext}
</KONTEKST_SPRAWY>

<WCZESNIEJSZA_DECYZJA>
${initialDecision}
</WCZESNIEJSZA_DECYZJA>

<POLITYKA>
${policy}
</POLITYKA>

Jeśli użytkownik pyta poza tematem zgłoszenia, odmów krótko po polsku i przekieruj rozmowę do sprawy.
Możesz zrewidować rekomendację tylko wtedy, gdy nowe informacje wpływają na konkretną regułę polityki albo jakość dowodów. Wtedy jasno napisz, co się zmieniło i dlaczego.
${nonBindingConstraint}
${noInventedRulesConstraint}
`.trim();
