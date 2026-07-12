import { LayoutDashboard, Briefcase, Clock, Bell, BarChart3, FileText, Settings, Archive, Users } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: Briefcase },
  { label: "Later", href: "/later", icon: Clock },
  { label: "Follow-ups", href: "/follow-ups", icon: Bell },
  { label: "Referral Contacts", href: "/referral-contacts", icon: Users },
  { label: "Vault", href: "/vault", icon: Archive },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Resume Library", href: "/resumes", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
