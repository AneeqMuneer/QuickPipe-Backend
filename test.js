const date = "2025-06-01";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const startDate = `${currentYear}-${currentMonth}-01`;
const endDate = `${currentYear}-${currentMonth}-${new Date(currentYear, currentMonth, 0).getDate()}`;

console.log(currentYear);
console.log(currentMonth);
console.log(startDate);
console.log(endDate);