"use client";

import * as React from "react";
import { WebsiteRecord, WebsiteDocument, WebsiteSection, WebsiteTheme, SectionItem, SectionButton } from "@/lib/validations/website";
import { DeviceMode, StudioView, generateId } from "@/components/website-builder/types";
import { TemplateGallery } from "@/components/website-builder/template-gallery";
import { EditorHeader } from "@/components/website-builder/editor-header";
import { EditorSidebar } from "@/components/website-builder/editor-sidebar";
import { EditorCanvas } from "@/components/website-builder/editor-canvas";
import { EditorInspector } from "@/components/website-builder/editor-inspector";
import { AddSectionModal } from "@/components/website-builder/add-section-modal";
import { AiAssistModal } from "@/components/website-builder/ai-assist-modal";
import { TEMPLATES } from "@/lib/templates/website-templates";

interface StudioClientProps {
  initialWebsites: WebsiteRecord[];
}

export default function StudioClient({ initialWebsites }: StudioClientProps) {
  const [view, setView] = React.useState<StudioView>("gallery");
  const [websites, setWebsites] = React.useState<WebsiteRecord[]>(initialWebsites);
  const [currentWebsite, setCurrentWebsite] = React.useState<WebsiteRecord | null>(null);
  const [document, setDocument] = React.useState<WebsiteDocument>(
    TEMPLATES["editorial-luxury"].initialDocument
  );
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(null);
  const [deviceMode, setDeviceMode] = React.useState<DeviceMode>("desktop");

  // History stack for Undo / Redo
  const [history, setHistory] = React.useState<WebsiteDocument[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);

  // Persistence status
  const [isDirty, setIsDirty] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);

  // Modals
  const [addSectionOpen, setAddSectionOpen] = React.useState<boolean>(false);
  const [addInsertIndex, setAddInsertIndex] = React.useState<number>(0);
  const [aiAssistOpen, setAiAssistOpen] = React.useState<boolean>(false);

  // Immediate action loading indicators
  const [creatingTemplate, setCreatingTemplate] = React.useState<string | null>(null);
  const [openingWebsiteId, setOpeningWebsiteId] = React.useState<string | null>(null);

  // Helper to commit document changes into undo stack
  const updateDocWithHistory = React.useCallback(
    (newDoc: WebsiteDocument) => {
      setDocument(newDoc);
      setIsDirty(true);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newDoc];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // 1. Create website from template or blank
  const handleSelectTemplate = async (
    templateId: "editorial-luxury" | "modern-saas" | "creative-studio" | "blank"
  ) => {
    setCreatingTemplate(templateId);
    const tpl = TEMPLATES[templateId] || TEMPLATES["blank"];
    const slugSuffix = Math.random().toString(36).substring(2, 6);
    const title = `${tpl.name} Site`;
    const slug = `${tpl.id}-${slugSuffix}`;

    try {
      const res = await fetch("/api/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          templateId,
          initialDocument: tpl.initialDocument,
        }),
      });

      const json = await res.json();
      if (json.data) {
        const created: WebsiteRecord = json.data;
        setWebsites((prev) => [created, ...prev]);
        setCurrentWebsite(created);
        setDocument(created.content);
        setSelectedSectionId(created.content.sections?.[0]?.id || null);
        setHistory([created.content]);
        setHistoryIndex(0);
        setIsDirty(false);
        setView("editor");
      }
    } catch (err) {
      console.error("Failed to create website:", err);
    } finally {
      setCreatingTemplate(null);
    }
  };

  // 2. Open existing website with instant responsive feedback
  const handleOpenWebsite = (w: WebsiteRecord) => {
    setOpeningWebsiteId(w.id);
    setTimeout(() => {
      setCurrentWebsite(w);
      setDocument(w.content);
      setSelectedSectionId(w.content.sections?.[0]?.id || null);
      setHistory([w.content]);
      setHistoryIndex(0);
      setIsDirty(false);
      setView("editor");
      setOpeningWebsiteId(null);
    }, 40);
  };

  // 3. Save draft to backend
  const handleSaveDraft = async () => {
    if (!currentWebsite) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/website/${currentWebsite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentWebsite.title,
          slug: currentWebsite.slug,
          document: document,
          isPublished: currentWebsite.is_published,
        }),
      });

      const json = await res.json();
      if (json.data) {
        const updated: WebsiteRecord = json.data;
        setCurrentWebsite(updated);
        setWebsites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setIsDirty(false);
        const now = new Date();
        setLastSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
      }
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Toggle publish status
  const handlePublishToggle = async () => {
    if (!currentWebsite) return;
    const targetStatus = !currentWebsite.is_published;
    try {
      const res = await fetch(`/api/website/${currentWebsite.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: targetStatus }),
      });
      const json = await res.json();
      if (json.data) {
        const updated: WebsiteRecord = json.data;
        setCurrentWebsite(updated);
        setWebsites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
    } catch (err) {
      console.error("Failed to update publish state:", err);
    }
  };

  // 5. Delete website
  const handleDeleteWebsite = async (id: string) => {
    try {
      await fetch(`/api/website/${id}`, { method: "DELETE" });
      setWebsites((prev) => prev.filter((item) => item.id !== id));
      if (currentWebsite?.id === id) {
        setCurrentWebsite(null);
        setView("gallery");
      }
    } catch (err) {
      console.error("Failed to delete website:", err);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevDoc = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setDocument(prevDoc);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextDoc = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setDocument(nextDoc);
      setIsDirty(true);
    }
  };

  // Section operations
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSections = [...document.sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleMoveDown = (index: number) => {
    if (index >= document.sections.length - 1) return;
    const newSections = [...document.sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleDuplicate = (index: number) => {
    const target = document.sections[index];
    const duplicated: WebsiteSection = {
      ...target,
      id: generateId("sec"),
      name: `${target.name} (Copy)`,
    };
    const newSections = [
      ...document.sections.slice(0, index + 1),
      duplicated,
      ...document.sections.slice(index + 1),
    ];
    updateDocWithHistory({ ...document, sections: newSections });
    setSelectedSectionId(duplicated.id);
  };

  const handleDeleteSection = (index: number) => {
    const targetId = document.sections[index].id;
    const newSections = document.sections.filter((_, i) => i !== index);
    updateDocWithHistory({ ...document, sections: newSections });
    if (selectedSectionId === targetId) {
      setSelectedSectionId(newSections[0]?.id || null);
    }
  };

  const handleToggleHide = (index: number) => {
    const newSections = document.sections.map((s, i) =>
      i === index ? { ...s, hidden: !s.hidden } : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleOpenAddSection = (insertIndex = document.sections.length) => {
    setAddInsertIndex(insertIndex);
    setAddSectionOpen(true);
  };

  const handleInsertSection = (newSection: WebsiteSection) => {
    const newSections = [
      ...document.sections.slice(0, addInsertIndex),
      newSection,
      ...document.sections.slice(addInsertIndex),
    ];
    updateDocWithHistory({ ...document, sections: newSections });
    setSelectedSectionId(newSection.id);
  };

  // Section editing updates
  const handleUpdateSectionField = (field: keyof WebsiteSection, value: unknown) => {
    if (!selectedSectionId) return;
    const newSections = document.sections.map((s) =>
      s.id === selectedSectionId ? { ...s, [field]: value } : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleUpdateSectionStyle = (stylePatch: Partial<WebsiteSection["style"]>) => {
    if (!selectedSectionId) return;
    const newSections = document.sections.map((s) =>
      s.id === selectedSectionId
        ? { ...s, style: { ...s.style, ...stylePatch } }
        : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleUpdateTheme = (themePatch: Partial<WebsiteTheme>) => {
    updateDocWithHistory({
      ...document,
      theme: { ...document.theme, ...themePatch },
    });
  };

  // Multi-item operations
  const handleAddItem = () => {
    if (!selectedSectionId) return;
    const newItem: SectionItem = {
      id: generateId("it"),
      title: "New Item",
      description: "Description of the new feature or project.",
    };
    const newSections = document.sections.map((s) =>
      s.id === selectedSectionId ? { ...s, items: [...(s.items || []), newItem] } : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleUpdateItem = (itemId: string, patch: Partial<SectionItem>) => {
    if (!selectedSectionId) return;
    const newSections = (document.sections || []).map((s) =>
      s.id === selectedSectionId
        ? {
            ...s,
            items: (s.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          }
        : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedSectionId) return;
    const newSections = (document.sections || []).map((s) =>
      s.id === selectedSectionId
        ? { ...s, items: (s.items || []).filter((it) => it.id !== itemId) }
        : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  // Button operations
  const handleAddButton = () => {
    if (!selectedSectionId) return;
    const newBtn: SectionButton = {
      id: generateId("btn"),
      text: "Explore",
      href: "#",
      variant: "primary",
    };
    const newSections = (document.sections || []).map((s) =>
      s.id === selectedSectionId ? { ...s, buttons: [...(s.buttons || []), newBtn] } : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleUpdateButton = (buttonId: string, patch: Partial<SectionButton>) => {
    if (!selectedSectionId) return;
    const newSections = (document.sections || []).map((s) =>
      s.id === selectedSectionId
        ? {
            ...s,
            buttons: (s.buttons || []).map((b) => (b.id === buttonId ? { ...b, ...patch } : b)),
          }
        : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  const handleDeleteButton = (buttonId: string) => {
    if (!selectedSectionId) return;
    const newSections = (document.sections || []).map((s) =>
      s.id === selectedSectionId
        ? { ...s, buttons: (s.buttons || []).filter((b) => b.id !== buttonId) }
        : s
    );
    updateDocWithHistory({ ...document, sections: newSections });
  };

  // Find currently selected section
  const selectedSection = (document.sections || []).find((s) => s.id === selectedSectionId) || null;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {view === "gallery" ? (
        <TemplateGallery
          websites={websites}
          creatingTemplate={creatingTemplate}
          openingWebsiteId={openingWebsiteId}
          onSelectTemplate={handleSelectTemplate}
          onOpenWebsite={handleOpenWebsite}
          onDeleteWebsite={handleDeleteWebsite}
          onStartBlank={() => handleSelectTemplate("blank")}
          onStartAiAssist={() => setAiAssistOpen(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Editor Header */}
          <EditorHeader
            title={currentWebsite?.title || "My Website"}
            slug={currentWebsite?.slug}
            isPublished={currentWebsite?.is_published || false}
            isDirty={isDirty}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            deviceMode={deviceMode}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            websiteId={currentWebsite?.id || ""}
            onTitleChange={(newTitle) => {
              if (currentWebsite) {
                setCurrentWebsite({ ...currentWebsite, title: newTitle });
                setIsDirty(true);
              }
            }}
            onDeviceModeChange={setDeviceMode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSave={handleSaveDraft}
            onPublishToggle={handlePublishToggle}
            onBackToGallery={() => setView("gallery")}
          />

          {/* 3-Column Architectural Editor Workspace */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* Left Rail: Structure & Document Theme */}
            <EditorSidebar
              document={document}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteSection}
              onToggleHide={handleToggleHide}
              onOpenAddSection={handleOpenAddSection}
              onUpdateTheme={handleUpdateTheme}
            />

            {/* Center Canvas: Live Editable Rendering */}
            <EditorCanvas
              document={document}
              selectedSectionId={selectedSectionId}
              deviceMode={deviceMode}
              onSelectSection={setSelectedSectionId}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteSection}
              onToggleHide={handleToggleHide}
              onOpenAddSection={handleOpenAddSection}
              onUpdateSectionField={(id, field, val) => {
                const newSections = document.sections.map((s) =>
                  s.id === id ? { ...s, [field]: val } : s
                );
                updateDocWithHistory({ ...document, sections: newSections });
              }}
            />

            {/* Right Rail: Contextual Property Inspector */}
            <EditorInspector
              document={document}
              selectedSection={selectedSection}
              onUpdateSectionField={handleUpdateSectionField}
              onUpdateSectionStyle={handleUpdateSectionStyle}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onAddButton={handleAddButton}
              onUpdateButton={handleUpdateButton}
              onDeleteButton={handleDeleteButton}
              onOpenAiAssist={() => setAiAssistOpen(true)}
              onUpdateDocSeo={(patch) =>
                updateDocWithHistory({
                  ...document,
                  seoTitle: patch.seoTitle ?? document.seoTitle,
                  seoDescription: patch.seoDescription ?? document.seoDescription,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Insert Section Modal */}
      <AddSectionModal
        isOpen={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
        onInsert={handleInsertSection}
      />

      {/* AI Copy Assistant Modal */}
      <AiAssistModal
        isOpen={aiAssistOpen}
        section={selectedSection || document.sections[0] || null}
        theme={document.theme}
        onClose={() => setAiAssistOpen(false)}
        onApply={(patch) => {
          if (!selectedSectionId) return;
          const newSections = document.sections.map((s) =>
            s.id === selectedSectionId ? { ...s, ...patch } : s
          );
          updateDocWithHistory({ ...document, sections: newSections });
        }}
      />
    </div>
  );
}
