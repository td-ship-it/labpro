export type UserRole = 'admin' | 'instructor' | 'researcher';

export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  title: string; // TS., PGS. TS., ThS., KTV, Nghiên cứu sinh
  department: string;
  phone: string;
  status: UserStatus;
  avatarBg: string;
}

export type EquipmentCategory = 
  | 'Quang phổ & Quang học'
  | 'Sắc ký & Khối phổ'
  | 'Kính hiển vi & Hình ảnh'
  | 'Sinh học phân tử & Ly tâm'
  | 'Nhiệt & Phân tích vật liệu'
  | 'Đo lường & Phân tích cơ bản';

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance';

export interface SOPStep {
  step: number;
  title: string;
  description: string;
  warning?: string;
  durationEstimate?: string;
}

export interface VideoTutorialChapter {
  time: string;
  seconds: number;
  label: string;
}

export interface VideoTutorialInfo {
  title: string;
  duration: string;
  description: string;
  instructorName?: string;
  keyTimestamps: VideoTutorialChapter[];
  notes?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  room: string;
  building: string;
  status: EquipmentStatus;
  manufacturer: string;
  model: string;
  specs: string;
  safetyGuidelines: string;
  maxBookingHoursPerSession: number;
  maintenanceSchedule?: string;
  responsibleStaff: string;
  // Documentation, SOP, and Video for QR Quick Hub
  sopTitle?: string;
  sopDocCode?: string;
  sopSteps?: SOPStep[];
  videoTutorial?: VideoTutorialInfo;
  manualDocName?: string;
  quickChecklist?: string[];
  emergencyContact?: string;
  // Maintenance forecasting configuration
  maintenanceConfig?: MaintenanceForecastConfig;
  lastMaintenanceDate?: string;
}

export type MaintenanceType = 
  | 'periodic_inspection' 
  | 'calibration' 
  | 'preventive' 
  | 'overhaul' 
  | 'emergency_repair';

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  maintenanceType: MaintenanceType;
  performedDate: string; // YYYY-MM-DD
  technicianName: string;
  agencyOrVendor?: string; // e.g., "Viện Đo Lường Quốc Gia VMI", "Hãng Agilent"
  certificateNumber?: string; // e.g., "CAL-2026-VMI-102"
  operatingHoursAtService: number; // Cumulative actual hours at service time
  costVND?: number;
  notes: string;
  replacedParts?: string[];
  nextRecommendedDueDate?: string;
  createdAt: string;
}

export interface MaintenanceForecastConfig {
  maxOperatingHoursThreshold: number; // e.g. 250 - 500 operating hours
  calendarIntervalDays: number; // e.g. 180 days (6 months)
  lastMaintenanceDate: string; // YYYY-MM-DD
  lastMaintenanceHours: number; // cumulative hours logged when last maintained
  targetCalibrationStandard?: string; // e.g. "ISO/IEC 17025", "VILAS", "TCVN"
  wearSensitivity?: 'standard' | 'high_precision' | 'heavy_duty';
}

export type MaintenanceUrgency = 'optimal' | 'attention' | 'urgent' | 'overdue';

export interface MaintenanceForecastResult {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  category: EquipmentCategory;
  room: string;
  currentStatus: EquipmentStatus;
  
  // Real log aggregates
  totalLogsCount: number;
  totalActualHours: number; // Sum of durationMinutes / 60
  hoursSinceLastMaintenance: number;
  totalSamplesProcessed: number;
  incidentsCount: number;
  abnormalConditionCount: number;
  
  // Stress & wear factors
  stressMultiplier: number; // 1.0 base, adjusted by conditions & incidents
  effectiveWearHours: number; // hoursSinceLastMaintenance * stressMultiplier
  
  // Thresholds & Baseline
  maxOperatingHoursThreshold: number;
  calendarIntervalDays: number;
  lastMaintenanceDate: string;
  
  // Burn rates
  recentDailyBurnRateHours: number; // hours/day based on recent handover logs
  historicalDailyBurnRateHours: number;
  effectiveBurnRateHours: number;
  
  // Health & Forecast projections
  healthPercentage: number; // 0 - 100%
  remainingUsefulHours: number;
  remainingDaysEstimated: number;
  predictedMaintenanceDate: string; // YYYY-MM-DD
  calendarDueDate: string; // YYYY-MM-DD
  recommendedMaintenanceDate: string; // min(predictedDate, calendarDueDate)
  isWearPacingFasterThanCalendar: boolean;
  daysVarianceVsCalendar: number; // negative means wear out faster than calendar
  
  urgency: MaintenanceUrgency;
  urgencyLabel: string;
  primaryRiskFactor: string;
  actionRecommendation: string;
  suggestedChecklist: string[];
}

export type ProjectStatus = 'active' | 'completed' | 'on_hold';

export interface ResearchProject {
  id: string;
  code: string; // e.g. "DT-VAST-2026", "NCS-MAT-01"
  name: string;
  principalInvestigator: string; // Chủ nhiệm đề tài / PI
  piEmail?: string;
  department: string;
  fundingAgency?: string; // NAFOSTED, VAST, BGD&ĐT, VinIF...
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  budgetTotalVND: number;
  materialBudgetVND: number; // Định mức vật tư tiêu hao
  status: ProjectStatus;
  colorTag: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  description: string;
  createdAt?: string;
}

export interface ConsumableSupply {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  unitCostVND: number;
  stockQuantity: number;
  compatibleCategory?: string;
}

export interface ConsumedSupplyItem {
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  quantity: number;
  unit: string;
  unitCostVND: number;
  totalCostVND: number;
  notes?: string;
}

export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  equipmentId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  projectId?: string;
  projectCode?: string;
  plannedSupplies?: ConsumedSupplyItem[];
  status: BookingStatus;
  createdAt: string;
  notes?: string;
}

export type MachineCondition = 'good' | 'minor_wear' | 'needs_calibration' | 'damaged';

export interface IncidentReport {
  hasIncident: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  resolved?: boolean;
}

export interface UsageLog {
  id: string;
  bookingId?: string;
  equipmentId: string;
  userId: string;
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
  durationMinutes?: number;
  initialCondition: MachineCondition;
  finalCondition?: MachineCondition;
  sampleCount?: number;
  incidentReport?: IncidentReport;
  projectId?: string;
  projectCode?: string;
  consumedSupplies?: ConsumedSupplyItem[];
  materialCostVND?: number;
  operatorNotes: string;
  supervisorNotes?: string;
}

export type EmailNotificationType = 
  | 'booking_confirmed' 
  | 'upcoming_reminder' 
  | 'incident_alert' 
  | 'maintenance_notice';

export interface EmailNotification {
  id: string;
  toEmail: string;
  toName: string;
  type: EmailNotificationType;
  subject: string;
  sentAt: string; // ISO
  bookingId?: string;
  equipmentId?: string;
  equipmentCode?: string;
  equipmentName?: string;
  room?: string;
  date?: string;
  timeSlot?: string;
  read: boolean;
  htmlPreview: {
    greeting: string;
    headline: string;
    contentParagraphs: string[];
    actionLabel?: string;
    securityNotes?: string;
  };
}

export type QuickNoteCategory = 'config' | 'tip' | 'warning' | 'protocol';

export interface EquipmentQuickNote {
  id: string;
  equipmentId: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  authorDepartment: string;
  title: string;
  content: string;
  category: QuickNoteCategory;
  parameters?: { key: string; value: string }[];
  isPinned: boolean;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  enableSearch?: boolean;
  grounding?: {
    searchQueries?: string[];
    sources?: GroundingSource[];
  };
  isError?: boolean;
}

