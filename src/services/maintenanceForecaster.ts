import { 
  Equipment, 
  UsageLog, 
  Booking, 
  MaintenanceRecord, 
  MaintenanceForecastConfig, 
  MaintenanceForecastResult, 
  MaintenanceUrgency 
} from '../types';

export interface ForecastOptions {
  loadMultiplier?: number; // 1.0 = normal, 1.5 = high load season, 2.0 = peak load
  customDate?: string; // Optional simulation anchor date (defaults to today)
}

// Category-based default threshold configs when an equipment item doesn't have custom config
export const DEFAULT_MAINTENANCE_CONFIGS: Record<string, Omit<MaintenanceForecastConfig, 'lastMaintenanceDate' | 'lastMaintenanceHours'>> = {
  'Kính hiển vi & Hình ảnh': {
    maxOperatingHoursThreshold: 300, // FE-SEM filament & high-vacuum pump cycle
    calendarIntervalDays: 180, // 6 months
    targetCalibrationStandard: 'ISO/IEC 17025 & Tiêu chuẩn Hãng JEOL',
    wearSensitivity: 'high_precision',
  },
  'Sắc ký & Khối phổ': {
    maxOperatingHoursThreshold: 250, // GC-MS/MS column bakeout & ion source EI cleaning
    calendarIntervalDays: 120, // 4 months
    targetCalibrationStandard: 'Dược điển VN V / USP <621> / ISO 17025',
    wearSensitivity: 'high_precision',
  },
  'Quang phổ & Quang học': {
    maxOperatingHoursThreshold: 400, // UV-Vis D2 / W lamp burn hours & filter accuracy
    calendarIntervalDays: 180, // 6 months
    targetCalibrationStandard: 'TCVN 6844 / ASTM E275',
    wearSensitivity: 'standard',
  },
  'Sinh học phân tử & Ly tâm': {
    maxOperatingHoursThreshold: 350, // qPCR 96-well Peltier block / Centrifuge high-speed bearings
    calendarIntervalDays: 180, // 6 months
    targetCalibrationStandard: 'ISO 13485 / Bio-Rad Technical Standard',
    wearSensitivity: 'standard',
  },
  'Nhiệt & Phân tích vật liệu': {
    maxOperatingHoursThreshold: 200, // TGA/DSC ultra-microbalance & thermocouple calibration
    calendarIntervalDays: 90, // 3 months
    targetCalibrationStandard: 'ASTM E967 / ISO 11357',
    wearSensitivity: 'high_precision',
  },
  'Đo lường & Phân tích cơ bản': {
    maxOperatingHoursThreshold: 500,
    calendarIntervalDays: 365,
    targetCalibrationStandard: 'Đo lường Việt Nam VMI',
    wearSensitivity: 'standard',
  },
};

/**
 * Returns the effective maintenance configuration for a piece of equipment.
 */
export function getEquipmentMaintenanceConfig(
  equipment: Equipment,
  latestRecord?: MaintenanceRecord
): MaintenanceForecastConfig {
  const categoryDefaults = 
    DEFAULT_MAINTENANCE_CONFIGS[equipment.category] || 
    DEFAULT_MAINTENANCE_CONFIGS['Đo lường & Phân tích cơ bản'];

  // Baseline last maintenance date: default to 60-120 days ago if no records
  const defaultLastDate = equipment.lastMaintenanceDate || 
    new Date(Date.now() - 86400000 * 75).toISOString().split('T')[0];

  return {
    maxOperatingHoursThreshold: equipment.maintenanceConfig?.maxOperatingHoursThreshold || categoryDefaults.maxOperatingHoursThreshold,
    calendarIntervalDays: equipment.maintenanceConfig?.calendarIntervalDays || categoryDefaults.calendarIntervalDays,
    lastMaintenanceDate: latestRecord?.performedDate || equipment.maintenanceConfig?.lastMaintenanceDate || defaultLastDate,
    lastMaintenanceHours: latestRecord?.operatingHoursAtService || equipment.maintenanceConfig?.lastMaintenanceHours || 0,
    targetCalibrationStandard: equipment.maintenanceConfig?.targetCalibrationStandard || categoryDefaults.targetCalibrationStandard,
    wearSensitivity: equipment.maintenanceConfig?.wearSensitivity || categoryDefaults.wearSensitivity,
  };
}

/**
 * Helper to compute session hours from a single usage log.
 */
export function getLogOperatingHours(log: UsageLog): number {
  if (log.durationMinutes && log.durationMinutes > 0) {
    return log.durationMinutes / 60;
  }
  if (log.checkInTime) {
    const endMs = log.checkOutTime ? new Date(log.checkOutTime).getTime() : Date.now();
    const startMs = new Date(log.checkInTime).getTime();
    const diffHours = Math.max(0.1, (endMs - startMs) / 3600000);
    return Math.round(diffHours * 10) / 10;
  }
  return 0;
}

/**
 * Calculates domain-specific checklist and maintenance guidelines
 */
function getActionRecommendationAndChecklist(
  equipment: Equipment,
  healthPercentage: number,
  isWearPacingFaster: boolean,
  daysVariance: number
): { recommendation: string; checklist: string[]; primaryRisk: string } {
  const category = equipment.category;
  let recommendation = '';
  let primaryRisk = '';
  const checklist: string[] = [];

  if (category === 'Kính hiển vi & Hình ảnh') {
    primaryRisk = healthPercentage < 30 
      ? 'Dây tóc phát xạ FE và dầu bơm khuếch tán chân không cao đã quá tải giờ làm việc' 
      : 'Bụi bẩn bám khẩu độ Aperture và suy giảm áp suất chân không buồng phát xạ';
    recommendation = healthPercentage < 20
      ? 'Cần ngừng ca đo lập tức để kỹ sư bảo dưỡng cụm chân không Turbo và thay khẩu độ.'
      : 'Lập lịch vệ sinh buồng mẫu, nạp dầu bơm cơ học và hiệu chuẩn độ phân giải nm chuẩn silicon.';
    checklist.push('Đo áp suất chân không cực hạn buồng mẫu (< 2.0e-4 Pa)');
    checklist.push('Vệ sinh buồng mẫu và thay lá chắn khẩu độ khách quan (Objective aperture)');
    checklist.push('Kiểm tra độ chụm chùm tia điện tử và căn chỉnh độ lệch quang Astigmatism');
    checklist.push('Thay dầu bơm hút sơ cấp Edwards và kiểm tra bẫy lạnh nitơ');
  } else if (category === 'Sắc ký & Khối phổ') {
    primaryRisk = healthPercentage < 30
      ? 'Nguồn ion hóa EI bị nhiễm bẩn, đệm nắp tiêm (Septum) rò rỉ khí mang Helium'
      : 'Cột phân tách HP-5MS tích tụ cặn mẫu phân cực cao, áp suất cột tăng';
    recommendation = healthPercentage < 20
      ? 'Khẩn cấp: Tiến hành rửa ngược cột, bảo dưỡng buồng ion nguồn EI và thay đệm inlet.'
      : 'Thực hiện chu trình nướng cột (Bake-out), kiểm tra rò rỉ khí mang và chạy autotune đánh giá tỷ lệ m/z.';
    checklist.push('Thay đệm cao su cổng tiêm (Inlet Septum) và ống lót Liner chia dòng');
    checklist.push('Rửa buồng ion hóa nguồn EI bằng bột Al2O3 siêu mịn và cồn siêu sạch');
    checklist.push('Kiểm tra dòng khí mang He bằng thiết bị dò rò rỉ điện tử');
    checklist.push('Chạy tiêu chuẩn Autotune với khí chuẩn PFTBA kiểm tra độ rộng pic');
  } else if (category === 'Quang phổ & Quang học') {
    primaryRisk = healthPercentage < 30
      ? 'Đèn tử ngoại Deuterium (D2) suy giảm quang thông và lệch bước sóng 656.1 nm'
      : 'Gương phản xạ và cách tử đơn sắc bám bụi quang sai';
    recommendation = healthPercentage < 20
      ? 'Đèn D2 đã đạt ngưỡng tuổi thọ tối đa, cần thay mới và hiệu chuẩn bước sóng với kính Holmium.'
      : 'Kiểm tra độ tuyến tính trắc quang, quét đường chuẩn kính lọc chuẩn Holmium oxide.';
    checklist.push('Kiểm tra cường độ phát xạ năng lượng đèn Deuterium (D2) và Halogen (W)');
    checklist.push('Hiệu chuẩn độ chính xác bước sóng với kính lọc oxit Holmium / Didymium');
    checklist.push('Kiểm tra độ ổn định đường nền Baseline và độ nhiễu RMS');
    checklist.push('Vệ sinh thấu kính và cảm quang quang học bằng cồn quang học chuyên dụng');
  } else if (category === 'Nhiệt & Phân tích vật liệu') {
    primaryRisk = healthPercentage < 30
      ? 'Cảm biến nhiệt ngẫu Thermocouple trôi nhiệt độ và buồng cân siêu vi lượng tích tụ oxit'
      : 'Nhiệt điện trở trôi điểm Zero và sai lệch hệ số đo entanpi';
    recommendation = healthPercentage < 20
      ? 'Ngừng đo mẫu để hiệu chuẩn lại điểm nóng chảy chuẩn Indium/Kẽm và cân vi lượng.'
      : 'Thực hiện quy trình làm sạch lò nhiệt độ cao và hiệu chuẩn độ nhạy nhiệt.';
    checklist.push('Hiệu chuẩn nhiệt độ và diện tích pic nóng chảy Indium (Tm = 156.6°C)');
    checklist.push('Kiểm tra độ tuyến tính đòn cân vi lượng với quả cân chuẩn 100 mg F1');
    checklist.push('Làm sạch ống lò nung bằng luồng khí oxy nhiệt độ cao');
    checklist.push('Kiểm tra lưu lượng kế khí bảo vệ N2/Argon');
  } else {
    primaryRisk = 'Hao mòn cơ học trục quay, cảm biến nhiệt và lệch thông số kỹ thuật chuẩn';
    recommendation = 'Lên kế hoạch kiểm định định kỳ theo tiêu chuẩn phòng thử nghiệm VILAS/ISO.';
    checklist.push('Kiểm tra các cảm biến an toàn liên động (Interlock switch)');
    checklist.push('Bôi trơn cơ cấu truyền động và siết chặt các điểm kết nối điện');
    checklist.push('Hiệu chuẩn các dải đo theo quy trình chuẩn của nhà sản xuất');
  }

  if (isWearPacingFaster) {
    recommendation = `[CẢNH BÁO TỐC ĐỘ]: Do tần suất đo thực tế rất cao, thiết bị đang hao mòn sớm hơn ${Math.abs(daysVariance)} ngày so với lịch định kỳ. ${recommendation}`;
  }

  return { recommendation, checklist, primaryRisk };
}

/**
 * Core Algorithm: Calculates predictive maintenance forecast for a single piece of equipment.
 */
export function calculateEquipmentMaintenanceForecast(
  equipment: Equipment,
  logs: UsageLog[],
  bookings: Booking[],
  maintenanceRecords: MaintenanceRecord[],
  options: ForecastOptions = {}
): MaintenanceForecastResult {
  const loadMultiplier = Math.max(0.1, options.loadMultiplier || 1.0);
  const now = options.customDate ? new Date(options.customDate) : new Date();

  // Find latest maintenance record for this equipment
  const eqRecords = maintenanceRecords
    .filter((r) => r.equipmentId === equipment.id)
    .sort((a, b) => new Date(b.performedDate).getTime() - new Date(a.performedDate).getTime());
  const latestRecord = eqRecords[0];

  const config = getEquipmentMaintenanceConfig(equipment, latestRecord);

  // Filter logs associated with this equipment
  const eqLogs = logs.filter((l) => l.equipmentId === equipment.id);

  // Total actual operating hours logged historically
  const totalActualHours = Math.round(
    eqLogs.reduce((acc, l) => acc + getLogOperatingHours(l), 0) * 10
  ) / 10;

  // Logs strictly after the last maintenance date
  const lastMaintTime = new Date(config.lastMaintenanceDate).getTime();
  const logsSinceLastMaint = eqLogs.filter((l) => {
    const logTime = new Date(l.checkInTime).getTime();
    return logTime >= lastMaintTime;
  });

  // Calculate actual hours since last maintenance
  const hoursSinceLastMaintenance = Math.round(
    logsSinceLastMaint.reduce((acc, l) => acc + getLogOperatingHours(l), 0) * 10
  ) / 10;

  // Aggregate metrics
  const totalSamplesProcessed = eqLogs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);
  const incidents = eqLogs.filter((l) => l.incidentReport?.hasIncident);
  const incidentsCount = incidents.length;

  const abnormalConditionLogs = eqLogs.filter((l) => 
    l.finalCondition === 'needs_calibration' || 
    l.finalCondition === 'damaged' || 
    l.finalCondition === 'minor_wear'
  );
  const abnormalConditionCount = abnormalConditionLogs.length;

  // 1. Stress Acceleration Multiplier (alpha)
  // Evaluates machine stress from handover logs
  let stressMultiplier = 1.0;

  // Penalties from condition reports in logs
  eqLogs.forEach((l) => {
    if (l.finalCondition === 'needs_calibration') stressMultiplier += 0.08;
    if (l.finalCondition === 'minor_wear') stressMultiplier += 0.03;
    if (l.finalCondition === 'damaged') stressMultiplier += 0.20;
    if (l.incidentReport?.hasIncident) {
      const sev = l.incidentReport.severity;
      if (sev === 'critical') stressMultiplier += 0.25;
      else if (sev === 'high') stressMultiplier += 0.15;
      else if (sev === 'medium') stressMultiplier += 0.08;
      else stressMultiplier += 0.04;
    }
  });

  // Sample density stress: high sample throughput adds stress
  if (totalActualHours > 0 && totalSamplesProcessed / totalActualHours > 8) {
    stressMultiplier += 0.10;
  }

  // Cap stress multiplier to realistic bounds [1.0, 2.2]
  stressMultiplier = Math.min(2.2, Math.max(1.0, Math.round(stressMultiplier * 100) / 100));

  // Effective wear hours = hours since last maintenance * stress multiplier
  const effectiveWearHours = Math.round(hoursSinceLastMaintenance * stressMultiplier * 10) / 10;

  // 2. Real Daily Burn Rate (V_daily)
  // Calculate average hours per day from the past 30 days of handover logs
  const thirtyDaysAgoMs = now.getTime() - 86400000 * 30;
  const recentLogs = eqLogs.filter((l) => new Date(l.checkInTime).getTime() >= thirtyDaysAgoMs);
  const recentHours = recentLogs.reduce((acc, l) => acc + getLogOperatingHours(l), 0);
  const recentDailyBurnRateHours = Math.round((recentHours / 30) * 100) / 100;

  // Historical overall burn rate (since last maintenance)
  const daysSinceLastMaint = Math.max(1, Math.round((now.getTime() - lastMaintTime) / 86400000));
  const historicalDailyBurnRateHours = Math.round((hoursSinceLastMaintenance / daysSinceLastMaint) * 100) / 100;

  // Look-ahead future bookings in next 14 days
  const futureBookings = bookings.filter((b) => {
    if (b.equipmentId !== equipment.id) return false;
    if (b.status === 'cancelled') return false;
    const bDate = new Date(b.date).getTime();
    return bDate >= now.getTime() && bDate <= now.getTime() + 86400000 * 14;
  });
  const bookedFutureHours = futureBookings.reduce((acc, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const diffH = Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);
    return acc + diffH;
  }, 0);
  const futureDailyRate = Math.round((bookedFutureHours / 14) * 100) / 100;

  // Effective burn rate projection: blend recent actuals (60%), future pipeline (25%), historical (15%)
  // Floor at 0.4 hours/day to prevent division by zero or infinite horizon
  const rawBurnRate = Math.max(
    0.4,
    recentDailyBurnRateHours * 0.6 + futureDailyRate * 0.25 + historicalDailyBurnRateHours * 0.15
  );
  const effectiveBurnRateHours = Math.round(rawBurnRate * loadMultiplier * 100) / 100;

  // 3. Remaining Useful Hours & Forecast Dates
  const maxThreshold = config.maxOperatingHoursThreshold;
  const remainingUsefulHours = Math.max(0, Math.round((maxThreshold - effectiveWearHours) * 10) / 10);

  // Estimated days remaining until operating hour limit reached
  const remainingDaysEstimated = effectiveBurnRateHours > 0 
    ? Math.round(remainingUsefulHours / effectiveBurnRateHours) 
    : 999;

  // Predicted Date based on usage hours
  const predictedMaintMs = now.getTime() + remainingDaysEstimated * 86400000;
  const predictedMaintenanceDate = new Date(predictedMaintMs).toISOString().split('T')[0];

  // Calendar Due Date based on fixed interval
  const calendarDueMs = lastMaintTime + config.calendarIntervalDays * 86400000;
  const calendarDueDate = new Date(calendarDueMs).toISOString().split('T')[0];

  // Recommended Maintenance Date: earliest of predicted and calendar
  const recommendedMaintenanceDate = predictedMaintMs <= calendarDueMs 
    ? predictedMaintenanceDate 
    : calendarDueDate;

  // Variance: Difference in days between predicted wear date and calendar date
  // Negative means wearing out faster than calendar schedule
  const daysVarianceVsCalendar = Math.round((predictedMaintMs - calendarDueMs) / 86400000);
  const isWearPacingFasterThanCalendar = daysVarianceVsCalendar < -3;

  // 4. Health Percentage (0% to 100%)
  const rawHealth = Math.round((1 - effectiveWearHours / maxThreshold) * 100);
  const healthPercentage = Math.max(0, Math.min(100, rawHealth));

  // 5. Urgency Classification
  let urgency: MaintenanceUrgency = 'optimal';
  let urgencyLabel = 'An toàn / Hoạt động tốt';

  const isPastCalendarDue = now.getTime() > calendarDueMs;
  const isOverHourThreshold = effectiveWearHours >= maxThreshold;
  const isUnder14Days = remainingDaysEstimated <= 14;
  const isUnder45Days = remainingDaysEstimated <= 45;

  if (isOverHourThreshold || isPastCalendarDue || equipment.status === 'maintenance') {
    urgency = 'overdue';
    urgencyLabel = equipment.status === 'maintenance' 
      ? 'Đang bảo trì / Kiểm định' 
      : 'Quá hạn kiểm định / Cần bảo dưỡng ngay';
  } else if (healthPercentage <= 20 || isUnder14Days) {
    urgency = 'urgent';
    urgencyLabel = 'Khẩn cấp (Sắp chạm ngưỡng giờ chạy)';
  } else if (healthPercentage <= 50 || isUnder45Days || isWearPacingFasterThanCalendar) {
    urgency = 'attention';
    urgencyLabel = 'Cần lưu ý & Lên lịch sớm';
  } else {
    urgency = 'optimal';
    urgencyLabel = 'Đạt chuẩn / Hoạt động tốt';
  }

  const { recommendation, checklist, primaryRisk } = getActionRecommendationAndChecklist(
    equipment,
    healthPercentage,
    isWearPacingFasterThanCalendar,
    daysVarianceVsCalendar
  );

  return {
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    equipmentName: equipment.name,
    category: equipment.category,
    room: equipment.room,
    currentStatus: equipment.status,

    totalLogsCount: eqLogs.length,
    totalActualHours,
    hoursSinceLastMaintenance,
    totalSamplesProcessed,
    incidentsCount,
    abnormalConditionCount,

    stressMultiplier,
    effectiveWearHours,

    maxOperatingHoursThreshold: maxThreshold,
    calendarIntervalDays: config.calendarIntervalDays,
    lastMaintenanceDate: config.lastMaintenanceDate,

    recentDailyBurnRateHours,
    historicalDailyBurnRateHours,
    effectiveBurnRateHours,

    healthPercentage,
    remainingUsefulHours,
    remainingDaysEstimated,
    predictedMaintenanceDate,
    calendarDueDate,
    recommendedMaintenanceDate,
    isWearPacingFasterThanCalendar,
    daysVarianceVsCalendar,

    urgency,
    urgencyLabel,
    primaryRiskFactor: primaryRisk,
    actionRecommendation: recommendation,
    suggestedChecklist: checklist,
  };
}

/**
 * Calculates predictive maintenance forecast for all equipment items.
 */
export function calculateAllMaintenanceForecasts(
  equipmentList: Equipment[],
  logs: UsageLog[],
  bookings: Booking[],
  maintenanceRecords: MaintenanceRecord[],
  options: ForecastOptions = {}
): MaintenanceForecastResult[] {
  return equipmentList.map((eq) =>
    calculateEquipmentMaintenanceForecast(eq, logs, bookings, maintenanceRecords, options)
  );
}
