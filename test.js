import "dotenv/config";
import { parseCommand } from "./ai.js";

console.log(JSON.stringify(await parseCommand("Pay Meera $50 and Arjun $75"), null, 2));
