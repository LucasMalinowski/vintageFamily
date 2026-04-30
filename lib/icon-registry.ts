import {
  // Home & Housing
  House, HousePlus, Building2, DoorOpen, Bed, Bath, Sofa, Armchair, Lamp,
  Wrench, Hammer, Key, Paintbrush, Trash2, Droplets, Wind, Zap,
  // Food & Dining
  Utensils, Coffee, Pizza, Apple, ShoppingCart, ShoppingBag, Store,
  ChefHat, Wine, Milk, IceCream2, Sandwich, Salad, Beef, Egg,
  // Transport
  Car, CarFront, Bus, Train, Bike, Plane, Fuel, Ship, Anchor, Truck,
  // Health & Wellness
  Heart, HeartPlus, Activity, Pill, Stethoscope, Baby, Syringe,
  Thermometer, Bandage, Eye,
  // Finance & Money
  Wallet, WalletCards, Banknote, CreditCard, PiggyBank, TrendingUp,
  TrendingDown, DollarSign, Receipt, BadgeDollarSign, Coins, BarChart2,
  PieChart, Landmark, HandCoins,
  // Education
  Book, BookOpen, GraduationCap, School, Pencil, NotebookPen, Library,
  // Entertainment & Leisure
  Guitar, Music, Music2, Gamepad2, Tv, MonitorPlay, Film, Camera,
  Headphones, Radio, Clapperboard, Ticket,
  // Clothing & Shopping
  Shirt, Watch, Gem, Tag,
  // Nature & Environment
  TreePalm, Trees, Flower, Flower2, Sun, Cloud, CloudRain, Leaf,
  Sprout, Mountain,
  // Tech & Devices
  Smartphone, Laptop, Wifi, Monitor, Tablet, Printer, Router,
  // Sports & Fitness
  Dumbbell, Trophy, Footprints, Target, Volleyball,
  // People & Social
  Users, User, UserCheck, Smile,
  // Pets
  Dog, Cat, PawPrint, Bird, Fish,
  // Subscriptions & Services
  Phone, Power, Globe, Star, Bell, Gift, Package, Box,
  MapPin, Calendar, Clock, Scissors, Flame, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type IconEntry = { name: string; component: LucideIcon }

export const ICON_REGISTRY: IconEntry[] = [
  // Home & Housing
  { name: 'House', component: House },
  { name: 'HousePlus', component: HousePlus },
  { name: 'Building2', component: Building2 },
  { name: 'DoorOpen', component: DoorOpen },
  { name: 'Bed', component: Bed },
  { name: 'Bath', component: Bath },
  { name: 'Sofa', component: Sofa },
  { name: 'Armchair', component: Armchair },
  { name: 'Lamp', component: Lamp },
  { name: 'Wrench', component: Wrench },
  { name: 'Hammer', component: Hammer },
  { name: 'Key', component: Key },
  { name: 'Paintbrush', component: Paintbrush },
  { name: 'Trash2', component: Trash2 },
  { name: 'Droplets', component: Droplets },
  { name: 'Wind', component: Wind },
  { name: 'Zap', component: Zap },
  // Food & Dining
  { name: 'Utensils', component: Utensils },
  { name: 'Coffee', component: Coffee },
  { name: 'Pizza', component: Pizza },
  { name: 'Apple', component: Apple },
  { name: 'ShoppingCart', component: ShoppingCart },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Store', component: Store },
  { name: 'ChefHat', component: ChefHat },
  { name: 'Wine', component: Wine },
  { name: 'Milk', component: Milk },
  { name: 'IceCream2', component: IceCream2 },
  { name: 'Sandwich', component: Sandwich },
  { name: 'Salad', component: Salad },
  { name: 'Beef', component: Beef },
  { name: 'Egg', component: Egg },
  // Transport
  { name: 'Car', component: Car },
  { name: 'CarFront', component: CarFront },
  { name: 'Bus', component: Bus },
  { name: 'Train', component: Train },
  { name: 'Bike', component: Bike },
  { name: 'Plane', component: Plane },
  { name: 'Fuel', component: Fuel },
  { name: 'Ship', component: Ship },
  { name: 'Anchor', component: Anchor },
  { name: 'Truck', component: Truck },
  // Health & Wellness
  { name: 'Heart', component: Heart },
  { name: 'HeartPlus', component: HeartPlus },
  { name: 'Activity', component: Activity },
  { name: 'Pill', component: Pill },
  { name: 'Stethoscope', component: Stethoscope },
  { name: 'Baby', component: Baby },
  { name: 'Syringe', component: Syringe },
  { name: 'Thermometer', component: Thermometer },
  { name: 'Bandage', component: Bandage },
  { name: 'Eye', component: Eye },
  // Finance & Money
  { name: 'Wallet', component: Wallet },
  { name: 'WalletCards', component: WalletCards },
  { name: 'Banknote', component: Banknote },
  { name: 'CreditCard', component: CreditCard },
  { name: 'PiggyBank', component: PiggyBank },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'TrendingDown', component: TrendingDown },
  { name: 'DollarSign', component: DollarSign },
  { name: 'Receipt', component: Receipt },
  { name: 'BadgeDollarSign', component: BadgeDollarSign },
  { name: 'Coins', component: Coins },
  { name: 'BarChart2', component: BarChart2 },
  { name: 'PieChart', component: PieChart },
  { name: 'Landmark', component: Landmark },
  { name: 'HandCoins', component: HandCoins },
  // Education
  { name: 'Book', component: Book },
  { name: 'BookOpen', component: BookOpen },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'School', component: School },
  { name: 'Pencil', component: Pencil },
  { name: 'NotebookPen', component: NotebookPen },
  { name: 'Library', component: Library },
  // Entertainment & Leisure
  { name: 'Guitar', component: Guitar },
  { name: 'Music', component: Music },
  { name: 'Music2', component: Music2 },
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Tv', component: Tv },
  { name: 'MonitorPlay', component: MonitorPlay },
  { name: 'Film', component: Film },
  { name: 'Camera', component: Camera },
  { name: 'Headphones', component: Headphones },
  { name: 'Radio', component: Radio },
  { name: 'Clapperboard', component: Clapperboard },
  { name: 'Ticket', component: Ticket },
  // Clothing & Shopping
  { name: 'Shirt', component: Shirt },
  { name: 'Watch', component: Watch },
  { name: 'Gem', component: Gem },
  { name: 'Tag', component: Tag },
  // Nature & Environment
  { name: 'TreePalm', component: TreePalm },
  { name: 'Trees', component: Trees },
  { name: 'Flower', component: Flower },
  { name: 'Flower2', component: Flower2 },
  { name: 'Sun', component: Sun },
  { name: 'Cloud', component: Cloud },
  { name: 'CloudRain', component: CloudRain },
  { name: 'Leaf', component: Leaf },
  { name: 'Sprout', component: Sprout },
  { name: 'Mountain', component: Mountain },
  // Tech & Devices
  { name: 'Smartphone', component: Smartphone },
  { name: 'Laptop', component: Laptop },
  { name: 'Wifi', component: Wifi },
  { name: 'Monitor', component: Monitor },
  { name: 'Tablet', component: Tablet },
  { name: 'Printer', component: Printer },
  { name: 'Router', component: Router },
  // Sports & Fitness
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Trophy', component: Trophy },
  { name: 'Footprints', component: Footprints },
  { name: 'Target', component: Target },
  { name: 'Volleyball', component: Volleyball },
  // People & Social
  { name: 'Users', component: Users },
  { name: 'User', component: User },
  { name: 'UserCheck', component: UserCheck },
  { name: 'Smile', component: Smile },
  // Pets
  { name: 'Dog', component: Dog },
  { name: 'Cat', component: Cat },
  { name: 'PawPrint', component: PawPrint },
  { name: 'Bird', component: Bird },
  { name: 'Fish', component: Fish },
  // General & Services
  { name: 'Phone', component: Phone },
  { name: 'Power', component: Power },
  { name: 'Globe', component: Globe },
  { name: 'Star', component: Star },
  { name: 'Bell', component: Bell },
  { name: 'Gift', component: Gift },
  { name: 'Package', component: Package },
  { name: 'Box', component: Box },
  { name: 'MapPin', component: MapPin },
  { name: 'Calendar', component: Calendar },
  { name: 'Clock', component: Clock },
  { name: 'Scissors', component: Scissors },
  { name: 'Flame', component: Flame },
  { name: 'Sparkles', component: Sparkles },
]

// Fast O(1) lookup by name
export const ICON_MAP = new Map<string, LucideIcon>(
  ICON_REGISTRY.map(({ name, component }) => [name, component])
)

export const PINNED_ICON_NAMES = [
  'House', 'Utensils', 'Smile', 'Car', 'HeartPlus', 'Shirt',
  'MonitorPlay', 'Book', 'Guitar', 'Receipt', 'Banknote', 'WalletCards',
  'BadgeDollarSign', 'TreePalm', 'PiggyBank', 'ShoppingCart',
]
