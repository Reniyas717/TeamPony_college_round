import test from "node:test";
import assert from "node:assert/strict";
import {
  WebsiteDocumentSchema,
  CreateWebsiteInputSchema,
  UpdateWebsiteInputSchema,
  WebsiteThemeSchema,
} from "../lib/validations/website";
import {
  TEMPLATES,
  getTemplateById,
  getAllTemplates,
  createDefaultWebsiteDocument,
} from "../lib/templates/website-templates";
import { generateId } from "../components/website-builder/types";

test("Nexus Studio - Website Builder Test Suite", async (t) => {
  await t.test("1. All initial templates strictly conform to WebsiteDocumentSchema", () => {
    const templates = getAllTemplates();
    assert.strictEqual(templates.length, 4, "Expected 4 templates (3 featured + blank)");

    const templateIds = templates.map((t) => t.id);
    assert.ok(templateIds.includes("editorial-luxury"), "Must include Editorial Luxury");
    assert.ok(templateIds.includes("modern-saas"), "Must include Modern SaaS");
    assert.ok(templateIds.includes("creative-studio"), "Must include Creative Studio");
    assert.ok(templateIds.includes("blank"), "Must include Blank Canvas");

    for (const template of templates) {
      const parsed = WebsiteDocumentSchema.safeParse(template.initialDocument);
      assert.ok(
        parsed.success,
        `Template "${template.name}" document must validate. Issues: ${JSON.stringify(
          parsed.error?.issues
        )}`
      );
      assert.ok(
        template.initialDocument.sections.length >= 3,
        `Template "${template.name}" must have at least 3 sections`
      );
    }
  });

  await t.test("2. Editorial Luxury has distinct luxury tokens and typography", () => {
    const luxury = getTemplateById("editorial-luxury");
    assert.ok(luxury, "Editorial Luxury template should exist");
    assert.strictEqual(luxury.initialDocument.theme.fontHeading, "bricolage");
    assert.strictEqual(luxury.initialDocument.theme.colorVibe, "editorial");
    assert.strictEqual(luxury.initialDocument.theme.accentColor, "#C85A32");
    assert.strictEqual(luxury.category, "Architecture & Atelier");
  });

  await t.test("3. Modern SaaS has high-contrast technical tokens and feature sections", () => {
    const saas = getTemplateById("modern-saas");
    assert.ok(saas, "Modern SaaS template should exist");
    assert.strictEqual(saas.initialDocument.theme.colorVibe, "saas");
    assert.strictEqual(saas.initialDocument.theme.accentColor, "#2563EB");
    const sectionTypes = saas.initialDocument.sections.map((s) => s.type);
    assert.ok(sectionTypes.includes("header"));
    assert.ok(sectionTypes.includes("hero"));
    assert.ok(sectionTypes.includes("features"));
    assert.ok(sectionTypes.includes("metrics"));
    assert.ok(sectionTypes.includes("pricing"));
    assert.ok(sectionTypes.includes("footer"));
  });

  await t.test("4. Creative Studio has avant-garde dark aesthetics and case studies", () => {
    const studio = getTemplateById("creative-studio");
    assert.ok(studio, "Creative Studio template should exist");
    assert.strictEqual(studio.initialDocument.theme.colorVibe, "creative");
    assert.strictEqual(studio.initialDocument.theme.accentColor, "#F43F5E");
    const sectionTypes = studio.initialDocument.sections.map((s) => s.type);
    assert.ok(sectionTypes.includes("header"));
    assert.ok(sectionTypes.includes("hero"));
    assert.ok(sectionTypes.includes("manifesto"));
    assert.ok(sectionTypes.includes("case-studies"));
    assert.ok(sectionTypes.includes("services"));
  });

  await t.test("5. Blank starter generates a valid minimal document with clean header and hero", () => {
    const blank = createDefaultWebsiteDocument("blank");
    const parsed = WebsiteDocumentSchema.safeParse(blank);
    assert.ok(parsed.success, "Blank document must be valid");
    assert.strictEqual(blank.sections.length, 3);
  });

  await t.test("6. CreateWebsiteInputSchema validates slug and required title", () => {
    const valid = CreateWebsiteInputSchema.safeParse({
      title: "Maison Aurelia",
      slug: "maison-aurelia",
      templateId: "editorial-luxury",
    });
    assert.ok(valid.success);

    const invalidSlug = CreateWebsiteInputSchema.safeParse({
      title: "Maison Aurelia",
      slug: "Maison Aurelia Invalid Slug!",
      templateId: "editorial-luxury",
    });
    assert.strictEqual(invalidSlug.success, false);
  });

  await t.test("7. UpdateWebsiteInputSchema validates structured document updates", () => {
    const validDoc = TEMPLATES["editorial-luxury"].initialDocument;
    const validPatch = UpdateWebsiteInputSchema.safeParse({
      title: "Updated Brand Title",
      document: validDoc,
    });
    assert.ok(validPatch.success);
  });

  await t.test("8. generateId utility generates unique prefixed identifiers", () => {
    const id1 = generateId("sec");
    const id2 = generateId("sec");
    assert.ok(id1.startsWith("sec_"));
    assert.ok(id2.startsWith("sec_"));
    assert.notStrictEqual(id1, id2);
  });

  await t.test("9. WebsiteThemeSchema enforces color vibe and font heading enums", () => {
    const validTheme = WebsiteThemeSchema.safeParse({
      fontHeading: "bricolage",
      fontBody: "manrope",
      colorVibe: "editorial",
      accentColor: "#C85A32",
    });
    assert.ok(validTheme.success);

    const invalidVibe = WebsiteThemeSchema.safeParse({
      colorVibe: "unknown-vibe",
    });
    assert.strictEqual(invalidVibe.success, false);
  });
});
