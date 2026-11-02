import { useId, useState } from "react";

const emptyProject = { title: "", technologies: "", image: "/portfoliowesite.png", url: "" };
const emptySkill = { name: "", level: "", image: "/html.png" };
const emptySocial = { label: "", url: "", icon: "github" };

function Field({ label, value, onChange, hint, multiline = false, type = "text", maxLength = 2000, required = false }) {
  const id = useId();
  const controlProps = {
    id,
    name: id,
    value: value ?? "",
    maxLength,
    required,
    onChange: (event) => onChange(event.target.value),
    "aria-describedby": hint ? `${id}-hint` : undefined,
  };

  return (
    <div className="editor-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea {...controlProps} rows={4} /> : <input {...controlProps} type={type} />}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

function AssetReferenceField(props) {
  return <Field {...props} hint="Use a project asset path (for example /PORT.jpg) or an HTTPS URL." />;
}

function ArrayEditor({ title, description, items, onAdd, children, maxItems = 40 }) {
  return (
    <fieldset className="content-editor-section">
      <legend>{title}</legend>
      {description && <p className="editor-help">{description}</p>}
      <div className="editor-list">{children}</div>
      <button className="editor-add-button" type="button" onClick={onAdd} disabled={items.length >= maxItems}>
        Add {title.toLowerCase().replace(/s$/, "")}
      </button>
    </fieldset>
  );
}

function safeReference(value) {
  return (value.startsWith("/") && !value.startsWith("//")) || /^https:\/\/\S+$/i.test(value);
}

function safeExternalLink(value) {
  return /^https:\/\/\S+$/i.test(value);
}

function validateDraft(draft) {
  const requiredFields = [
    ["Brand", draft.brand],
    ["Name", draft.name],
    ["Tagline", draft.tagline],
    ["Headline", draft.headline],
    ["About", draft.about],
    ["Résumé", draft.resume],
    ["Profile photo", draft.portrait],
    ["About photo", draft.aboutImage],
  ];
  const missing = requiredFields.find(([, value]) => !value?.trim());
  if (missing) return `${missing[0]} is required.`;
  if (!safeReference(draft.resume) || !safeReference(draft.portrait) || !safeReference(draft.aboutImage)) {
    return "Photo and résumé references must be local asset paths or HTTPS URLs.";
  }
  if (!/^\d{7,15}$/.test(draft.contactPhone || "")) return "WhatsApp number must contain 7–15 digits.";
  if (draft.skills.some((skill) => !skill.name.trim() || !skill.level.trim() || !safeReference(skill.image))) {
    return "Each skill needs a name, level, and valid image reference.";
  }
  if (draft.projects.some((project) =>
    !project.title.trim() || !project.technologies.trim() ||
    !safeReference(project.image) || !safeExternalLink(project.url))) {
    return "Each project needs a title, technology list, valid image reference, and HTTPS link.";
  }
  if (draft.social.some((item) => !item.label.trim() || !safeExternalLink(item.url))) {
    return "Each social link needs a label and a valid HTTPS URL.";
  }
  if (draft.details.some(([label, value]) => !label.trim() || !value.trim())) return "Each profile detail needs both a label and a value.";
  return "";
}

export default function AdminContentEditor({ content, onSave, dbReady }) {
  const [draft, setDraft] = useState(content);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateItem(collection, index, key, value) {
    setDraft((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) =>
        itemIndex === index
          ? (typeof item === "string"
            ? value
            : Array.isArray(item)
              ? item.map((part, partIndex) => partIndex === key ? value : part)
              : { ...item, [key]: value })
          : item,
      ),
    }));
  }

  function removeItem(collection, index) {
    setDraft((current) => ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function save(event) {
    event.preventDefault();
    const validationMessage = validateDraft(draft);
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save portfolio content.");
      setDraft(result.content);
      onSave(result.content);
      setNotice("Portfolio content saved.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="content-edit-form" onSubmit={save}>
      <p className="editor-intro">Update each section below. Your changes appear on the portfolio after you save.</p>

      <fieldset className="content-editor-section">
        <legend>Profile and introduction</legend>
        <div className="editor-grid">
          <Field label="Brand name" value={draft.brand} onChange={(value) => update("brand", value)} required maxLength={100} />
          <Field label="Your name" value={draft.name} onChange={(value) => update("name", value)} required maxLength={120} />
          <Field label="Short tagline" value={draft.tagline} onChange={(value) => update("tagline", value)} required maxLength={160} />
          <Field label="Headline" value={draft.headline} onChange={(value) => update("headline", value)} required maxLength={200} />
          <Field label="About you" value={draft.about} onChange={(value) => update("about", value)} multiline required maxLength={2000} />
          <Field label="WhatsApp number" value={draft.contactPhone} onChange={(value) => update("contactPhone", value)} hint="Include country code; enter digits only." maxLength={15} required />
          <AssetReferenceField label="Profile photo" value={draft.portrait} onChange={(value) => update("portrait", value)} required />
          <AssetReferenceField label="About photo" value={draft.aboutImage} onChange={(value) => update("aboutImage", value)} required />
          <AssetReferenceField label="Résumé" value={draft.resume} onChange={(value) => update("resume", value)} required />
        </div>
      </fieldset>

      <ArrayEditor
        title="Profile details"
        items={draft.details}
        onAdd={() => update("details", [...draft.details, ["New detail", ""]])}
      >
        {draft.details.map(([label, value], index) => (
          <div className="editor-row editor-detail-row" key={`detail-${index}`}>
            <Field label="Label" value={label} onChange={(next) => updateItem("details", index, 0, next)} maxLength={100} required />
            <Field label="Value" value={value} onChange={(next) => updateItem("details", index, 1, next)} maxLength={300} required />
            <button className="editor-remove-button" type="button" onClick={() => removeItem("details", index)} aria-label={`Remove ${label || "detail"}`}>Remove</button>
          </div>
        ))}
      </ArrayEditor>

      <ArrayEditor
        title="Interests"
        items={draft.interests}
        onAdd={() => update("interests", [...draft.interests, "New interest"])}
      >
        {draft.interests.map((interest, index) => (
          <div className="editor-row editor-interest-row" key={`interest-${index}`}>
            <Field label={`Interest ${index + 1}`} value={interest} onChange={(next) => updateItem("interests", index, 0, next)} maxLength={80} required />
            <button className="editor-remove-button" type="button" onClick={() => removeItem("interests", index)} aria-label={`Remove ${interest}`}>Remove</button>
          </div>
        ))}
      </ArrayEditor>

      <ArrayEditor
        title="Skills"
        items={draft.skills}
        onAdd={() => update("skills", [...draft.skills, { ...emptySkill }])}
        maxItems={80}
      >
        {draft.skills.map((skill, index) => (
          <div className="editor-card" key={`skill-${index}`}>
            <div className="editor-card-heading"><strong>Skill {index + 1}</strong><button className="editor-remove-button" type="button" onClick={() => removeItem("skills", index)} aria-label={`Remove ${skill.name || "skill"}`}>Remove</button></div>
            <div className="editor-grid">
              <Field label="Skill name" value={skill.name} onChange={(value) => updateItem("skills", index, "name", value)} maxLength={100} required />
              <Field label="Level" value={skill.level} onChange={(value) => updateItem("skills", index, "level", value)} maxLength={30} required />
              <AssetReferenceField label="Skill image" value={skill.image} onChange={(value) => updateItem("skills", index, "image", value)} required />
            </div>
          </div>
        ))}
      </ArrayEditor>

      <ArrayEditor
        title="Projects"
        items={draft.projects}
        onAdd={() => update("projects", [...draft.projects, { ...emptyProject }])}
        maxItems={80}
      >
        {draft.projects.map((project, index) => (
          <div className="editor-card" key={`project-${index}`}>
            <div className="editor-card-heading"><strong>Project {index + 1}</strong><button className="editor-remove-button" type="button" onClick={() => removeItem("projects", index)} aria-label={`Remove ${project.title || "project"}`}>Remove</button></div>
            <div className="editor-grid">
              <Field label="Project name" value={project.title} onChange={(value) => updateItem("projects", index, "title", value)} maxLength={200} required />
              <Field label="Technologies" value={project.technologies} onChange={(value) => updateItem("projects", index, "technologies", value)} maxLength={300} required />
              <AssetReferenceField label="Project image" value={project.image} onChange={(value) => updateItem("projects", index, "image", value)} required />
              <Field label="Project link" value={project.url} onChange={(value) => updateItem("projects", index, "url", value)} hint="Use an HTTPS link to the live project or repository." maxLength={1000} required />
            </div>
          </div>
        ))}
      </ArrayEditor>

      <ArrayEditor
        title="Social links"
        items={draft.social}
        onAdd={() => update("social", [...draft.social, { ...emptySocial }])}
      >
        {draft.social.map((item, index) => (
          <div className="editor-row editor-social-row" key={`social-${index}`}>
            <Field label="Network" value={item.label} onChange={(value) => updateItem("social", index, "label", value)} maxLength={80} required />
            <Field label="HTTPS profile link" value={item.url} onChange={(value) => updateItem("social", index, "url", value)} maxLength={1000} required />
            <label className="editor-field" htmlFor={`social-icon-${index}`}>Icon
              <select id={`social-icon-${index}`} value={item.icon} onChange={(event) => updateItem("social", index, "icon", event.target.value)}>
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
              </select>
            </label>
            <button className="editor-remove-button" type="button" onClick={() => removeItem("social", index)} aria-label={`Remove ${item.label || "social link"}`}>Remove</button>
          </div>
        ))}
      </ArrayEditor>

      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <div className="editor-actions">
        <button className="btn outline" type="button" onClick={() => { setDraft(content); setNotice("Unsaved edits discarded."); }} disabled={busy}>Discard edits</button>
        <button className="btn primary" type="submit" disabled={busy || !dbReady}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
