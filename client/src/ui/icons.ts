import { createElement, type IconNode } from "lucide";

/** Build a sized lucide SVG element. */
export function icon(node: IconNode, size = 16, strokeWidth = 2): SVGElement {
  const el = createElement(node);
  el.setAttribute("width", `${size}`);
  el.setAttribute("height", `${size}`);
  el.setAttribute("stroke-width", `${strokeWidth}`);
  return el;
}

export {
  Lock,
  Minus,
  Square,
  X,
  Check,
  Dices,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  // Laptop apps
  Bell,
  MessageSquare,
  Users,
  Calendar,
  Phone,
  Folder,
  Search,
  User,
  Pin,
  FileText,
  Hash,
  Home,
  GraduationCap,
  HelpCircle,
  Volume2,
} from "lucide";
