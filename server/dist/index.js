"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const error_express_1 = require("error-express");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Serve static files from the 'public' directory
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.all('*', (req, res) => {
    res.status(200).send("server works");
});
app.use(error_express_1.globalErrorHandler);
app.listen(5000, () => {
    console.log(`server running on http://localhost:5000`);
});
//# sourceMappingURL=index.js.map