import * as xlsx from "xlsx";

// D-07: CampMinder column format — Last Name, Preferred Name, SwimCode, Bunk
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([
  ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
  ["Smith", "Jane", "042", "Cabin 3"],
  ["Doe", "John", "101", "Cabin 7"],
]);
xlsx.utils.book_append_sheet(wb, ws, "Roster");
xlsx.writeFile(wb, "public/sample-roster.xlsx");
console.log("Generated public/sample-roster.xlsx with CampMinder columns.");
