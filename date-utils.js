import { monthNames } from "./constants.js?v=20260517flatfix2";

export const toDDMMYY = (dStr) => {
    if (!dStr) return "";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return `${String(d.getDate()).padStart(2,'0')}-${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

export const toISO = (customDate) => {
    if (!customDate || !customDate.includes('-')) return "";
    const p = customDate.split('-');
    const monthIndex = monthNames.indexOf(p[1]);
    return monthIndex !== -1 ? `20${p[2]}-${String(monthIndex + 1).padStart(2,'0')}-${p[0].padStart(2,'0')}` : "";
};

export const parseManualDate = (s) => {
    if(!s || !s.includes('-')) return null;
    const p = s.split('-');
    const mIdx = monthNames.indexOf(p[1]);
    return mIdx !== -1 ? new Date(parseInt("20" + p[2]), mIdx, parseInt(p[0])) : null;
};

export const diffDays = (dEnd, dStart) => {
    return (dEnd && dStart) ? Math.ceil((dEnd.getTime() - dStart.getTime()) / 86400000) : "";
};
