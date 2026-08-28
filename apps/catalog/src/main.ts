/** Renders the catalogue from the repository's single app registry. */
import apps from "../../../app-registry.json";
import "./styles.css";

declare const __CATALOGUE_GENERATED_AT__: string;

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Catalogue root element is missing");

// Keep apps with the same displayed month in their precise update order.
const appTimestamp = (updatedAt: string) => Date.parse(updatedAt);

// The seconds make short build and deployment delays visible without a full date.
const generatedAt = new Date(__CATALOGUE_GENERATED_AT__).toLocaleTimeString(
  "en-GB",
  {
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  },
);

const cards = [...apps]
  .sort(
    (left, right) =>
      appTimestamp(right.updatedAt) - appTimestamp(left.updatedAt),
  )
  .map(
    (app) => `
      <a class="app-card" href="./${app.id}/" style="--accent: ${app.themeColour}">
        <span class="app-icon" aria-hidden="true">${app.emoji}</span>
        <span class="app-details">
          <span class="app-date">${app.date}</span>
          <strong>${app.title}</strong>
          <span class="app-description">${app.description}</span>
          <span class="app-action">Open app <span aria-hidden="true">→</span></span>
        </span>
      </a>
    `,
  )
  .join("");

root.innerHTML = `
  <main>
    <header class="hero">
      <div class="hero-mark" aria-hidden="true">✨</div>
      <p class="eyebrow">Pick something playful</p>
      <h1>Kid Apps</h1>
      <p class="intro">Games, creative prompts and curious visual experiments for the whole family.</p>
    </header>
    <section class="app-grid" aria-label="Apps">${cards}</section>
    <footer>
      <span>Made for curious minds and rainy afternoons.</span>
      <span class="generation-time">Generated ${generatedAt} UTC</span>
    </footer>
  </main>
`;
