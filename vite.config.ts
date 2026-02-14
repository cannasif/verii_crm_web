import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const allowedHosts = ["https://crm.v3rii.com"];
export default defineConfig({
  base: "/crm-ui/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("powerbi-client")) return "vendor-powerbi";
          if (id.includes("@tiptap")) return "vendor-tiptap";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("pptxgenjs") || id.includes("jspdf")) return "vendor-doc-export";
          if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("html2canvas")) return "vendor-html2canvas";
        },
      },
    },
  },
  server: {
    allowedHosts: allowedHosts,
    host: "0.0.0.0",
  },
})
