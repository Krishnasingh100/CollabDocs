function text(value, marks) {
  return marks?.length
    ? { type: "text", text: value, marks: marks.map((m) => ({ type: m })) }
    : { type: "text", text: value };
}
function paragraph(value, attrs) {
  const node = {
    type: "paragraph",
    content: typeof value === "string" ? [text(value)] : value,
  };
  if (attrs) node.attrs = attrs;
  return node;
}
function heading(level, value, attrs) {
  return {
    type: "heading",
    attrs: { level, ...attrs },
    content: [text(value)],
  };
}
function bulletList(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}
function orderedList(items) {
  return {
    type: "orderedList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}
function taskList(items) {
  return {
    type: "taskList",
    content: items.map((item) => ({
      type: "taskItem",
      attrs: { checked: item.checked ?? false },
      content: [paragraph(item.label)],
    })),
  };
}
function table(headers, rows) {
  const row = (cells, header) => ({
    type: "tableRow",
    content: cells.map((cell) => ({
      type: header ? "tableHeader" : "tableCell",
      content: [paragraph(cell)],
    })),
  });
  return { type: "table", content: [row(headers, true), ...rows.map((r) => row(r, false))] };
}
function image(src, alt) {
  return { type: "image", attrs: { src, alt } };
}
function quote(value) {
  return { type: "blockquote", content: [paragraph(value)] };
}
function doc(...content) {
  return { type: "doc", content };
}
export const TEMPLATES = [
  {
    id: "blank",
    name: "Blank document",
    title: "Untitled document",
    tagline: "A clean page",
    accent: "#64748b",
    banner: null,
    preview: "blank",
    content: null,
    plainText: "",
  },
  {
    id: "report",
    name: "Report",
    title: "Untitled report",
    tagline: "Summary, metrics, next steps",
    accent: "#2563eb",
    banner: "/templates/report.svg",
    preview: "report",
    content: doc(
      image("/templates/report.svg", "Report cover illustration"),
      heading(1, "Quarterly report"),
      paragraph("A concise view of how the quarter went and what happens next."),
      heading(2, "Executive summary"),
      paragraph([
        text("Revenue grew 12% quarter over quarter, driven by "),
        text("new team workspaces", ["bold"]),
        text(" and renewed annual plans."),
      ]),
      heading(2, "Key metrics"),
      table(
        ["Metric", "Last quarter", "This quarter"],
        [
          ["Revenue", "$182k", "$204k"],
          ["Active workspaces", "1,204", "1,538"],
          ["Churn", "3.1%", "2.4%"],
        ],
      ),
      heading(2, "Next steps"),
      bulletList([
        "Publish the report to the team site",
        "Schedule the quarterly review",
        "Draft goals for next quarter",
      ]),
    ),
    plainText:
      "Quarterly report\nA concise view of how the quarter went and what happens next.\nExecutive summary\nRevenue grew 12% quarter over quarter, driven by new team workspaces and renewed annual plans.\nKey metrics\nRevenue: $182k → $204k; Active workspaces: 1,204 → 1,538; Churn: 3.1% → 2.4%.\nNext steps\nPublish the report to the team site; Schedule the quarterly review; Draft goals for next quarter.",
  },
  {
    id: "meeting-notes",
    name: "Meeting notes",
    title: "Untitled meeting notes",
    tagline: "Agenda, decisions, actions",
    accent: "#059669",
    banner: "/templates/meeting.svg",
    preview: "notes",
    content: doc(
      heading(1, "Meeting notes"),
      paragraph("Date: Monday, 9:30 AM · Attendees: add names here"),
      heading(2, "Agenda"),
      bulletList(["Project status round-up", "Blockers and risks", "Plan for next week"]),
      heading(2, "Decisions"),
      quote("We ship the templates update on Friday and review numbers next Monday."),
      heading(2, "Action items"),
      taskList([
        { label: "Send the launch checklist to the team", checked: true },
        { label: "Confirm Friday release scope" },
        { label: "Book next Monday's review" },
      ]),
    ),
    plainText:
      "Meeting notes\nDate: Monday, 9:30 AM · Attendees: add names here\nAgenda\nProject status round-up; Blockers and risks; Plan for next week.\nDecisions\nWe ship the templates update on Friday and review numbers next Monday.\nAction items\n[x] Send the launch checklist to the team; [ ] Confirm Friday release scope; [ ] Book next Monday's review.",
  },
  {
    id: "resume",
    name: "Resume",
    title: "Untitled resume",
    tagline: "Experience and skills",
    accent: "#7c3aed",
    banner: "/templates/resume.svg",
    preview: "resume",
    content: doc(
      heading(1, "Your name", { textAlign: "center" }),
      paragraph("you@example.com · (555) 123-4567 · City, Country", {
        textAlign: "center",
      }),
      heading(2, "Experience"),
      bulletList([
        [text("Senior Editor, Example Co. ", ["bold"]), text("(2022 — now)")],
        [text("Staff Writer, Sample Studio ", ["bold"]), text("(2019 — 2022)")],
      ]),
      paragraph("Led the docs refresh that cut onboarding questions by a third."),
      heading(2, "Education"),
      paragraph("B.A. in Communication, State University (2015 — 2019)."),
      heading(2, "Skills"),
      paragraph("Writing and editing · Templates and style guides · Print and PDF export."),
    ),
    plainText:
      "Your name\nyou@example.com · (555) 123-4567 · City, Country\nExperience\nSenior Editor, Example Co. (2022 — now); Staff Writer, Sample Studio (2019 — 2022).\nLed the docs refresh that cut onboarding questions by a third.\nEducation\nB.A. in Communication, State University (2015 — 2019).\nSkills\nWriting and editing · Templates and style guides · Print and PDF export.",
  },
  {
    id: "letter",
    name: "Letter",
    title: "Untitled letter",
    tagline: "Formal and ready to send",
    accent: "#d97706",
    banner: "/templates/letter.svg",
    preview: "letter",
    content: doc(
      paragraph("123 Maple Street, Springfield", { textAlign: "right" }),
      paragraph("September 17, 2026", { textAlign: "right" }),
      paragraph("Dear Hiring Manager,"),
      paragraph(
        "I am writing to apply for the Content Editor role. For the past four years I have written documentation, built templates, and kept style guides that teams actually use.",
      ),
      paragraph(
        "I would welcome the chance to bring that experience to your team. Thank you for your time and consideration.",
      ),
      paragraph("Sincerely,"),
      paragraph([text("Your name", ["bold"])]),
    ),
    plainText:
      "123 Maple Street, Springfield\nSeptember 17, 2026\nDear Hiring Manager,\nI am writing to apply for the Content Editor role. For the past four years I have written documentation, built templates, and kept style guides that teams actually use.\nI would welcome the chance to bring that experience to your team. Thank you for your time and consideration.\nSincerely,\nYour name",
  },
  {
    id: "proposal",
    name: "Project proposal",
    title: "Untitled proposal",
    tagline: "Goals, timeline, budget",
    accent: "#0d9488",
    banner: "/templates/proposal.svg",
    preview: "proposal",
    content: doc(
      image("/templates/proposal.svg", "Proposal cover illustration"),
      heading(1, "Project proposal"),
      paragraph("What we will build, when it ships, and what it costs."),
      heading(2, "Goals"),
      bulletList([
        "Launch template galleries in the dashboard",
        "Cut time-to-first-document in half",
        "Keep every document printable and exportable",
      ]),
      heading(2, "Timeline"),
      orderedList([
        "Week 1–2: designs and content model",
        "Week 3–4: editor and gallery build",
        "Week 5: testing, polish, and launch",
      ]),
      heading(2, "Budget"),
      table(
        ["Item", "Cost"],
        [
          ["Design", "$4,000"],
          ["Build", "$9,500"],
          ["Testing and launch", "$2,500"],
        ],
      ),
      quote("Approved budgets stay valid for 90 days from the date above."),
    ),
    plainText:
      "Project proposal\nWhat we will build, when it ships, and what it costs.\nGoals\nLaunch template galleries in the dashboard; Cut time-to-first-document in half; Keep every document printable and exportable.\nTimeline\nWeek 1–2: designs and content model; Week 3–4: editor and gallery build; Week 5: testing, polish, and launch.\nBudget\nDesign: $4,000; Build: $9,500; Testing and launch: $2,500.\nApproved budgets stay valid for 90 days from the date above.",
  },
];
