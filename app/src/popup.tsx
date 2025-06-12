import { createRoot } from "react-dom/client";
// import App from "@src/components/Settings/cvnl";
import App2 from "@src/components/TokenManager";

const rootContainer = document.querySelector('#app');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(<App2 />);