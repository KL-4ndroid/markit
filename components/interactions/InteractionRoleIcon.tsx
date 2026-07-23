import { Eye, MessageSquare, UserPlus } from 'lucide-react';
import type { InteractionButton } from '@/lib/interaction-buttons-store';

interface InteractionRoleIconProps {
  role: InteractionButton['role'];
  className?: string;
}

const ICON_BY_ROLE = {
  interest: Eye,
  engage: MessageSquare,
  convert: UserPlus,
} satisfies Record<InteractionButton['role'], typeof Eye>;

export function InteractionRoleIcon({ role, className }: InteractionRoleIconProps) {
  const Icon = ICON_BY_ROLE[role];
  return <Icon className={className} aria-hidden="true" />;
}
