export const simulatePatientSeries = (nHours, startHour, currentVitals, profile) => {
    const history = [];
    let cur = { ...currentVitals };

    // Helper for random normal distribution
    const randn_bm = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    const clip = (val, min, max) => Math.max(min, Math.min(val, max));

    for (let t = 0; t < nHours; t++) {
        const hour = startHour + t;

        cur.heart_rate = clip(cur.heart_rate + randn_bm() * 2.5, 35, 190);
        cur.respiratory_rate = clip(cur.respiratory_rate + randn_bm() * 0.8, 8, 60);
        cur.spo2_pct = clip(cur.spo2_pct + randn_bm() * 0.6 - (cur.sepsis_risk_score - 0.5) * 0.04, 70, 100);
        cur.temperature_c = clip(cur.temperature_c + randn_bm() * 0.03, 34.0, 41.0);
        cur.systolic_bp = clip(cur.systolic_bp + randn_bm() * 1.2, 70, 190);
        cur.diastolic_bp = clip(cur.diastolic_bp + randn_bm() * 0.7, 40, 130);

        cur.wbc_count = clip(cur.wbc_count + randn_bm() * 0.15, 0.5, 40);
        cur.lactate = clip(cur.lactate + randn_bm() * 0.05, 0.1, 12);
        cur.creatinine = clip(cur.creatinine + randn_bm() * 0.03, 0.1, 10);
        cur.crp_level = clip(cur.crp_level + randn_bm() * 0.25, 0, 200);
        cur.hemoglobin = clip(cur.hemoglobin + randn_bm() * 0.08, 4, 20);
        cur.sepsis_risk_score = clip(cur.sepsis_risk_score + randn_bm() * 0.03, 0, 1);

        if (cur.spo2_pct < 92) {
            cur.oxygen_flow = clip(cur.oxygen_flow + randn_bm() * 0.25 + 0.6, 0, 15);
        } else {
            cur.oxygen_flow = clip(cur.oxygen_flow + randn_bm() * 0.25 + 0.1, 0, 15);
        }

        cur.mobility_score = clip(cur.mobility_score + randn_bm() * 0.2, 0, 5);
        const alertIncrease = (cur.sepsis_risk_score > 0.75 && Math.random() < 0.25) ? 1 : 0;
        cur.nurse_alert = clip(cur.nurse_alert + alertIncrease, 0, 1);

        history.push({
            hour_from_admission: hour,
            ...cur,
            nurse_alert: Math.round(cur.nurse_alert),
            mobility_score: Math.round(cur.mobility_score * 10) / 10
        });
    }

    return history;
};
