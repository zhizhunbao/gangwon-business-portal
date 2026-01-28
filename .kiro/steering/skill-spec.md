---
inclusion: fileMatch
fileMatchPattern: "**/SKILL.md"
---

# Skill File Specification

Follow this specification when creating or editing SKILL.md files in `backend/scripts/data/skills/`.

## Directory Structure

```
skill-name/
├── SKILL.md          (required - main skill definition)
├── metadata.json     (optional - skill metadata and keywords)
├── references/       (optional - detailed documentation)
│   ├── guide.md
│   └── examples.md
└── scripts/          (optional - executable helper scripts)
    └── helper.py
```

## SKILL.md Format

### Front Matter (Required)

```yaml
---
name: skill-name
description: Brief skill purpose + trigger conditions. Use when (1) ..., (2) ..., (3) ...
---
```

**Requirements:**

- `name`: Kebab-case identifier matching directory name
- `description`: Must include both functionality AND specific trigger conditions (when to use this skill)
- Keep description under 100 words for efficient metadata loading

### Body Content (Required)

Direct instructions for the AI assistant. Follow these rules:

- **Be concise**: Avoid redundant explanations; assume AI competence
- **Use imperative mood**: "Read the file", "Apply these steps", "Validate before proceeding"
- **Reference external docs**: Point to `references/` for detailed content
- **Structure clearly**: Use headings, lists, and code blocks for readability
- **Stay focused**: Only include information the AI cannot infer from general knowledge

**Typical sections:**

- Objectives (what to accomplish)
- Key instructions (how to accomplish it)
- Validation steps (how to verify success)
- References (where to find more details)

## Core Principles

### 1. Context Efficiency

Context window is a shared resource. Only include information that:

- Is specific to this skill domain
- Cannot be inferred from general AI knowledge
- Directly impacts task execution

### 2. Progressive Disclosure

Load information in layers:

1. **Metadata** (name + description) - Always loaded (~100 words)
2. **SKILL.md body** - Loaded when skill is triggered (<5000 words, ideally <2000)
3. **references/** - Loaded on-demand when explicitly referenced

### 3. Maintainability

- Keep SKILL.md under 500 lines
- Move detailed content to `references/`
- Use clear section headings for navigation
- Add table of contents if file exceeds 100 lines

## Validation Checklist

Before finalizing a SKILL.md file, verify:

- [ ] Front matter includes both `name` and `description`
- [ ] Description specifies clear trigger conditions
- [ ] Body uses imperative instructions
- [ ] Content is under 500 lines
- [ ] No redundant explanations of basic concepts
- [ ] References to external docs are clear and actionable
- [ ] File structure follows markdown conventions

## Anti-Patterns (Do Not)

- ❌ Create README.md, CHANGELOG.md, or other extraneous files
- ❌ Include "When to Use" section in body (belongs in description)
- ❌ Write verbose explanations of concepts AI already understands
- ❌ Duplicate content between SKILL.md and references/
- ❌ Use passive voice or vague instructions
- ❌ Exceed 500 lines without moving content to references/

## Project-Specific Rules

### i18n Organization

**Critical principle:** Only truly shared/common translations belong in `shared/i18n`. Module-specific translations MUST stay within their respective modules.

**Structure:**
```
frontend/src/
├── shared/
│   └── i18n/
│       └── locales/        ← Only common translations
│           ├── zh.json
│           └── ko.json
└── [module]/
    └── modules/
        └── [feature]/
            └── locales/    ← Feature-specific translations
                ├── zh.json
                └── ko.json
```

**What belongs in `shared/i18n`:**
- ✅ Common UI labels (buttons, actions, status)
- ✅ Shared validation messages
- ✅ Common error messages
- ✅ Global navigation terms
- ✅ Reusable component labels

**What stays in module locales:**
- ✅ Feature-specific terminology
- ✅ Module-specific forms and fields
- ✅ Business domain terms
- ✅ Module-specific workflows and instructions

**Rationale:** Keeps modules self-contained and prevents shared i18n from becoming a dumping ground. Each module owns its translations and can be moved/refactored independently.

## Referencing External Documentation

When pointing to detailed guides in `references/`:

```markdown
**For detailed implementation guide:** See `references/implementation.md`
**For code examples:** See `references/examples.md`
```

Specify when the AI should read the reference:

- "Read this before proceeding"
- "Consult this if validation fails"
- "Reference this for edge cases"

## Example Structure

```markdown
---
name: example-skill
description: Helps with X task. Use when (1) user asks about X, (2) working with Y files, (3) need to validate Z.
---

# Example Skill

## Objectives

- Accomplish primary goal A
- Validate condition B
- Generate output C

## Instructions

1. Read the input file
2. Apply transformation X
3. Validate result meets criteria Y
4. Output in format Z

**For detailed transformation rules:** See `references/transformation-guide.md`

## Validation

Verify the output:

- Criterion 1: Check that...
- Criterion 2: Ensure that...

## Common Issues

- Issue A: Solution X
- Issue B: Solution Y
```
