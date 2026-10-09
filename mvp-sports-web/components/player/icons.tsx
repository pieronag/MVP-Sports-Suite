"use client";
// Set de íconos del área Jugador (PWA): todos son Hugeicons.
// Conserva los nombres y props usados antes (size, color, strokeWidth,
// className, style, fill) para no reescribir cada pantalla.
import type { CSSProperties } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Activity01Icon as HiActivity01Icon,
    AlertCircleIcon as HiAlertCircleIcon,
    AnalyticsUpIcon as HiAnalyticsUpIcon,
    ArrowLeft01Icon as HiArrowLeft01Icon,
    ArrowRight01Icon as HiArrowRight01Icon,
    Award01Icon as HiAward01Icon,
    Book02Icon as HiBook02Icon,
    Building03Icon as HiBuilding03Icon,
    Calendar03Icon as HiCalendar03Icon,
    Call02Icon as HiCall02Icon,
    Camera01Icon as HiCamera01Icon,
    Cancel01Icon as HiCancel01Icon,
    CancelCircleIcon as HiCancelCircleIcon,
    Car01Icon as HiCar01Icon,
    ChampionIcon as HiChampionIcon,
    CheckmarkCircle01Icon as HiCheckmarkCircle01Icon,
    CheckmarkCircle02Icon as HiCheckmarkCircle02Icon,
    Clock01Icon as HiClock01Icon,
    Compass01Icon as HiCompass01Icon,
    Copy01Icon as HiCopy01Icon,
    CreditCardIcon as HiCreditCardIcon,
    Crown02Icon as HiCrown02Icon,
    Delete02Icon as HiDelete02Icon,
    Download01Icon as HiDownload01Icon,
    Download04Icon as HiDownload04Icon,
    Edit02Icon as HiEdit02Icon,
    FastWindIcon as HiFastWindIcon,
    FavouriteIcon as HiFavouriteIcon,
    File01Icon as HiFile01Icon,
    FlashIcon as HiFlashIcon,
    FloppyDiskIcon as HiFloppyDiskIcon,
    Globe02Icon as HiGlobe02Icon,
    GpsSignal01Icon as HiGpsSignal01Icon,
    Home01Icon as HiHome01Icon,
    Image01Icon as HiImage01Icon,
    Image02Icon as HiImage02Icon,
    InformationCircleIcon as HiInformationCircleIcon,
    Invoice01Icon as HiInvoice01Icon,
    Location01Icon as HiLocation01Icon,
    LockIcon as HiLockIcon,
    Login01Icon as HiLogin01Icon,
    Logout01Icon as HiLogout01Icon,
    Menu01Icon as HiMenu01Icon,
    Message01Icon as HiMessage01Icon,
    Moon02Icon as HiMoon02Icon,
    MoreHorizontalIcon as HiMoreHorizontalIcon,
    Mortarboard02Icon as HiMortarboard02Icon,
    Navigation03Icon as HiNavigation03Icon,
    PlusSignIcon as HiPlusSignIcon,
    RecordIcon as HiRecordIcon,
    RefreshIcon as HiRefreshIcon,
    RulerIcon as HiRulerIcon,
    Search01Icon as HiSearch01Icon,
    SecurityCheckIcon as HiSecurityCheckIcon,
    SentIcon as HiSentIcon,
    Settings02Icon as HiSettings02Icon,
    Share01Icon as HiShare01Icon,
    Share08Icon as HiShare08Icon,
    Shield01Icon as HiShield01Icon,
    SparklesIcon as HiSparklesIcon,
    StarIcon as HiStarIcon,
    Sun03Icon as HiSun03Icon,
    Sword03Icon as HiSword03Icon,
    Target02Icon as HiTarget02Icon,
    Task01Icon as HiTask01Icon,
    Tv01Icon as HiTv01Icon,
    UmbrellaIcon as HiUmbrellaIcon,
    UnavailableIcon as HiUnavailableIcon,
    UserGroupIcon as HiUserGroupIcon,
    UserIcon as HiUserIcon,
    ViewIcon as HiViewIcon,
    ViewOffIcon as HiViewOffIcon,
    WeightScaleIcon as HiWeightScaleIcon,
    Wifi01Icon as HiWifi01Icon,
    ArrowDown01Icon as HiArrowDown01Icon,
    Calendar01Icon as HiCalendar01Icon,
    CalendarCheckIn01Icon as HiCalendarCheckIn01Icon,
    CpuIcon as HiCpuIcon,
    CrosshairIcon as HiCrosshairIcon,
    DrillIcon as HiDrillIcon,
    FilterHorizontalIcon as HiFilterHorizontalIcon,
    FireIcon as HiFireIcon,
    FootprintsIcon as HiFootprintsIcon,
    HandshakeIcon as HiHandshakeIcon,
    Loading03Icon as HiLoading03Icon,
    Mail01Icon as HiMail01Icon,
    Medal01Icon as HiMedal01Icon,
    MinusSignIcon as HiMinusSignIcon,
    PlayIcon as HiPlayIcon,
    ShieldAlertIcon as HiShieldAlertIcon,
    SmartPhone01Icon as HiSmartPhone01Icon,
    StarsIcon as HiStarsIcon,
    SunriseIcon as HiSunriseIcon,
    Sword01Icon as HiSword01Icon,
    Ticket01Icon as HiTicket01Icon,
    Timer01Icon as HiTimer01Icon,
    Basketball01Icon as HiBasketball01Icon,
    BasketballHoopIcon as HiBasketballHoopIcon,
    FootballIcon as HiFootballIcon,
    FootballPitchIcon as HiFootballPitchIcon,
    TableTennisBatIcon as HiTableTennisBatIcon,
    TennisBallIcon as HiTennisBallIcon,
    TennisRacketIcon as HiTennisRacketIcon,
    VolleyballIcon as HiVolleyballIcon,
} from "@hugeicons/core-free-icons";

export interface PlayerIconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    className?: string;
    style?: CSSProperties;
    fill?: string;
    onClick?: () => void;
}

type IconData = typeof HiHome01Icon;

const make = (icon: IconData, name: string) => {
    const Icon = ({ size = 24, color = "currentColor", strokeWidth = 1.6, className, style, fill, onClick }: PlayerIconProps) => (
        <HugeiconsIcon
            icon={icon}
            size={size}
            color={color}
            strokeWidth={Number(strokeWidth)}
            className={className}
            style={fill && fill !== "none" ? { ...style, fill } : style}
            onClick={onClick}
        />
    );
    Icon.displayName = name;
    return Icon;
};

export const Activity = make(HiActivity01Icon, "Activity");
export const AlertCircle = make(HiAlertCircleIcon, "AlertCircle");
export const ArrowRight = make(HiArrowRight01Icon, "ArrowRight");
export const Award = make(HiAward01Icon, "Award");
export const Ban = make(HiUnavailableIcon, "Ban");
export const BookOpen = make(HiBook02Icon, "BookOpen");
export const Building2 = make(HiBuilding03Icon, "Building2");
export const Calendar = make(HiCalendar03Icon, "Calendar");
export const Camera = make(HiCamera01Icon, "Camera");
export const Car = make(HiCar01Icon, "Car");
export const CheckCircle = make(HiCheckmarkCircle01Icon, "CheckCircle");
export const CheckCircle2 = make(HiCheckmarkCircle02Icon, "CheckCircle2");
export const ChevronLeft = make(HiArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = make(HiArrowRight01Icon, "ChevronRight");
export const CircleDot = make(HiRecordIcon, "CircleDot");
export const ClipboardList = make(HiTask01Icon, "ClipboardList");
export const Clock = make(HiClock01Icon, "Clock");
export const Compass = make(HiCompass01Icon, "Compass");
export const Copy = make(HiCopy01Icon, "Copy");
export const CreditCard = make(HiCreditCardIcon, "CreditCard");
export const Crown = make(HiCrown02Icon, "Crown");
export const Download = make(HiDownload04Icon, "Download");
export const Edit = make(HiEdit02Icon, "Edit");
export const Eye = make(HiViewIcon, "Eye");
export const EyeOff = make(HiViewOffIcon, "EyeOff");
export const FileText = make(HiFile01Icon, "FileText");
export const Globe = make(HiGlobe02Icon, "Globe");
export const GraduationCap = make(HiMortarboard02Icon, "GraduationCap");
export const Heart = make(HiFavouriteIcon, "Heart");
export const Home = make(HiHome01Icon, "Home");
export const Image = make(HiImage01Icon, "Image");
export const Images = make(HiImage02Icon, "Images");
export const Info = make(HiInformationCircleIcon, "Info");
export const Locate = make(HiGpsSignal01Icon, "Locate");
export const Lock = make(HiLockIcon, "Lock");
export const LogIn = make(HiLogin01Icon, "LogIn");
export const LogOut = make(HiLogout01Icon, "LogOut");
export const MapPin = make(HiLocation01Icon, "MapPin");
export const Menu = make(HiMenu01Icon, "Menu");
export const MessageCircle = make(HiMessage01Icon, "MessageCircle");
export const Moon = make(HiMoon02Icon, "Moon");
export const MoreHorizontal = make(HiMoreHorizontalIcon, "MoreHorizontal");
export const Navigation = make(HiNavigation03Icon, "Navigation");
export const Phone = make(HiCall02Icon, "Phone");
export const Plus = make(HiPlusSignIcon, "Plus");
export const Receipt = make(HiInvoice01Icon, "Receipt");
export const Ruler = make(HiRulerIcon, "Ruler");
export const Save = make(HiFloppyDiskIcon, "Save");
export const Search = make(HiSearch01Icon, "Search");
export const Send = make(HiSentIcon, "Send");
export const Settings = make(HiSettings02Icon, "Settings");
export const Share = make(HiShare08Icon, "Share");
export const Share2 = make(HiShare01Icon, "Share2");
export const Shield = make(HiShield01Icon, "Shield");
export const ShieldCheck = make(HiSecurityCheckIcon, "ShieldCheck");
export const Sparkles = make(HiSparklesIcon, "Sparkles");
export const Star = make(HiStarIcon, "Star");
export const Sun = make(HiSun03Icon, "Sun");
export const Swords = make(HiSword03Icon, "Swords");
export const Target = make(HiTarget02Icon, "Target");
export const Trash2 = make(HiDelete02Icon, "Trash2");
export const TrendingUp = make(HiAnalyticsUpIcon, "TrendingUp");
export const Trophy = make(HiChampionIcon, "Trophy");
export const Tv = make(HiTv01Icon, "Tv");
export const Umbrella = make(HiUmbrellaIcon, "Umbrella");
export const User = make(HiUserIcon, "User");
export const Users = make(HiUserGroupIcon, "Users");
export const Weight = make(HiWeightScaleIcon, "Weight");
export const Wifi = make(HiWifi01Icon, "Wifi");
export const Wind = make(HiFastWindIcon, "Wind");
export const X = make(HiCancel01Icon, "X");
export const XCircle = make(HiCancelCircleIcon, "XCircle");
export const Zap = make(HiFlashIcon, "Zap");
export const RefreshCw = make(HiRefreshIcon, "RefreshCw");
export const DownloadTray = make(HiDownload01Icon, "DownloadTray");
export const CalendarCheck = make(HiCalendarCheckIn01Icon, "CalendarCheck");
export const CalendarDays = make(HiCalendar01Icon, "CalendarDays");
export const ChevronDown = make(HiArrowDown01Icon, "ChevronDown");
export const Cpu = make(HiCpuIcon, "Cpu");
export const Crosshair = make(HiCrosshairIcon, "Crosshair");
export const Drill = make(HiDrillIcon, "Drill");
export const Flame = make(HiFireIcon, "Flame");
export const Footprints = make(HiFootprintsIcon, "Footprints");
export const Handshake = make(HiHandshakeIcon, "Handshake");
export const Loader = make(HiLoading03Icon, "Loader");
export const Mail = make(HiMail01Icon, "Mail");
export const Medal = make(HiMedal01Icon, "Medal");
export const Minus = make(HiMinusSignIcon, "Minus");
export const Play = make(HiPlayIcon, "Play");
export const ShieldAlert = make(HiShieldAlertIcon, "ShieldAlert");
export const SlidersHorizontal = make(HiFilterHorizontalIcon, "SlidersHorizontal");
export const Smartphone = make(HiSmartPhone01Icon, "Smartphone");
export const Stars = make(HiStarsIcon, "Stars");
export const Sunrise = make(HiSunriseIcon, "Sunrise");
export const Sword = make(HiSword01Icon, "Sword");
export const Ticket = make(HiTicket01Icon, "Ticket");
export const Timer = make(HiTimer01Icon, "Timer");

// Deportes (reemplazan components/icons/SportsIcons en el área Jugador)
export const FutbolIcon = make(HiFootballIcon, "FutbolIcon");
export const PadelIcon = make(HiTableTennisBatIcon, "PadelIcon");
export const TenisIcon = make(HiTennisBallIcon, "TenisIcon");
export const BasquetbolIcon = make(HiBasketball01Icon, "BasquetbolIcon");
export const VoleibolIcon = make(HiVolleyballIcon, "VoleibolIcon");
export const CanchaFutbolIcon = make(HiFootballPitchIcon, "CanchaFutbolIcon");
export const CanchaPadelIcon = make(HiTableTennisBatIcon, "CanchaPadelIcon");
export const CanchaTenisIcon = make(HiTennisRacketIcon, "CanchaTenisIcon");
export const CanchaBasquetbolIcon = make(HiBasketballHoopIcon, "CanchaBasquetbolIcon");
export const CanchaVoleibolIcon = make(HiVolleyballIcon, "CanchaVoleibolIcon");
export const SoccerIcon = make(HiFootballIcon, "SoccerIcon");
export const TennisIcon = make(HiTennisBallIcon, "TennisIcon");
export const BasketballIcon = make(HiBasketball01Icon, "BasketballIcon");
export const VolleyballIcon = make(HiVolleyballIcon, "VolleyballIcon");
