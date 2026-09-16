import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
import OctagonAlertIcon from '@hugeicons/core-free-icons/OctagonAlertIcon';
import Alert01Icon from '@hugeicons/core-free-icons/Alert01Icon';
import AlertCircleIcon from '@hugeicons/core-free-icons/AlertCircleIcon';
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import Message01Icon from '@hugeicons/core-free-icons/Message01Icon';
import SearchRemoveIcon from '@hugeicons/core-free-icons/SearchRemoveIcon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import LayoutDashboardIcon from '@hugeicons/core-free-icons/LayoutDashboardIcon';
import Building02Icon from '@hugeicons/core-free-icons/Building02Icon';
import File02Icon from '@hugeicons/core-free-icons/File02Icon';
import File01Icon from '@hugeicons/core-free-icons/File01Icon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import ArrowUpDownIcon from '@hugeicons/core-free-icons/ArrowUpDownIcon';
import GaugeIcon from '@hugeicons/core-free-icons/GaugeIcon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import DatabaseIcon from '@hugeicons/core-free-icons/DatabaseIcon';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon';
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon';
import SlidersHorizontalIcon from '@hugeicons/core-free-icons/SlidersHorizontalIcon';
import Logout01Icon from '@hugeicons/core-free-icons/Logout01Icon';
import Notification03Icon from '@hugeicons/core-free-icons/Notification03Icon';
import ThumbsUpIcon from '@hugeicons/core-free-icons/ThumbsUpIcon';
import ThumbsDownIcon from '@hugeicons/core-free-icons/ThumbsDownIcon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import UnfoldMoreIcon from '@hugeicons/core-free-icons/UnfoldMoreIcon';
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon';
import ChevronUpIcon from '@hugeicons/core-free-icons/ChevronUpIcon';
import Loading02Icon from '@hugeicons/core-free-icons/Loading02Icon';
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon';
import Shield01Icon from '@hugeicons/core-free-icons/Shield01Icon';
import UserCheck01Icon from '@hugeicons/core-free-icons/UserCheck01Icon';

// The project's one icon set — Hugeicons' free "Stroke Rounded" collection,
// replacing Lucide app-wide (see design-system.md's "do not mix icon
// libraries" rule; this file is the single place that rule is satisfied
// from). Every icon used anywhere in the app is wrapped here under the same
// name its Lucide equivalent had, so every call site only ever changed its
// import source, never its JSX — see the migration's own commit for the
// full file list. Each icon is imported from its own subpath rather than
// the package's barrel export, which pulls in its entire 6,000+ icon
// module and is slow enough in practice to matter.
export type AppIcon = (props: {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}) => React.JSX.Element;

function createIcon(data: IconSvgElement): AppIcon {
  return function Icon(props) {
    return <HugeiconsIcon icon={data} {...props} />;
  };
}

export const Plus = createIcon(PlusSignIcon);
export const AlertOctagon = createIcon(OctagonAlertIcon);
export const AlertTriangle = createIcon(Alert01Icon);
export const AlertCircle = createIcon(AlertCircleIcon);
export const Info = createIcon(InformationCircleIcon);
export const MessageSquare = createIcon(Message01Icon);
export const SearchX = createIcon(SearchRemoveIcon);
export const CircleCheck = createIcon(CheckmarkCircle02Icon);
export const CheckCircle2 = createIcon(CheckmarkCircle02Icon);
export const LayoutDashboard = createIcon(LayoutDashboardIcon);
export const Building2 = createIcon(Building02Icon);
export const FileText = createIcon(File02Icon);
export const ScrollText = createIcon(File01Icon);
export const Clock = createIcon(Clock01Icon);
export const Search = createIcon(Search01Icon);
export const ArrowUpDown = createIcon(ArrowUpDownIcon);
export const Gauge = createIcon(GaugeIcon);
export const ArrowRight = createIcon(ArrowRight01Icon);
export const Database = createIcon(DatabaseIcon);
export const Menu = createIcon(Menu01Icon);
export const X = createIcon(Cancel01Icon);
export const Moon = createIcon(Moon01Icon);
export const Sun = createIcon(Sun01Icon);
export const SlidersHorizontal = createIcon(SlidersHorizontalIcon);
export const LogOut = createIcon(Logout01Icon);
export const Bell = createIcon(Notification03Icon);
export const ThumbsUp = createIcon(ThumbsUpIcon);
export const ThumbsDown = createIcon(ThumbsDownIcon);
export const Sparkles = createIcon(SparklesIcon);
export const Settings = createIcon(Settings01Icon);
export const ArrowUp = createIcon(ArrowUp01Icon);
export const ArrowDown = createIcon(ArrowDown01Icon);
export const ChevronsUpDown = createIcon(UnfoldMoreIcon);
export const ChevronDown = createIcon(ChevronDownIcon);
export const ChevronUp = createIcon(ChevronUpIcon);
export const Loader2 = createIcon(Loading02Icon);
export const FileCheck = createIcon(FileValidationIcon);
export const Shield = createIcon(Shield01Icon);
export const UserCheck = createIcon(UserCheck01Icon);
