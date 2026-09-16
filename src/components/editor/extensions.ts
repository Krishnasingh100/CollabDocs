import { CharacterCount } from "@tiptap/extension-character-count";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from "@tiptap/extension-text-style";
import { Typography } from "@tiptap/extension-typography";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
      // link is handled by the dedicated Link extension below
      link: false,
      underline: false,
    }),
    TextStyle,
    FontSize,
    LineHeight,
    FontFamily,
    Color,
    Underline,
    Superscript,
    Subscript,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
    Placeholder.configure({
      placeholder: "Type or paste your content here…  ( / for blocks )",
    }),
    CharacterCount,
  ];
}

export const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Calibri", value: "Calibri, 'Segoe UI', sans-serif" },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Garamond", value: "Garamond, Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Merriweather", value: "Merriweather, Georgia, serif" },
  { label: "Roboto", value: "Roboto, Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Verdana, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

export const FONT_SIZES = [
  "8",
  "9",
  "10",
  "11",
  "12",
  "14",
  "16",
  "18",
  "20",
  "22",
  "24",
  "26",
  "28",
  "32",
  "36",
  "48",
  "72",
];

export const LINE_HEIGHTS = ["1.0", "1.15", "1.5", "1.75", "2.0", "2.5"];

export const TEXT_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#cccccc",
  "#ffffff",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#0b8043",
  "#38761d",
  "#134f5c",
  "#0c343d",
];

export const HIGHLIGHT_COLORS = [
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#ff00ff",
  "#ff9900",
  "#ff0000",
  "#4a86e8",
  "#cccccc",
  "#fff2cc",
  "#d9ead3",
  "#c9daf8",
  "transparent",
];
