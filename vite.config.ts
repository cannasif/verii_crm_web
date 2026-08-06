import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const allowedHosts = ["https://crm.v3rii.com"]

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsDir: "public/assets",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const isSignalrPureAnnotationWarning =
          warning.code === "INVALID_ANNOTATION" &&
          typeof warning.id === "string" &&
          warning.id.includes("@microsoft/signalr") &&
          warning.message.includes("/*#__PURE__*/")

        if (isSignalrPureAnnotationWarning) return

        defaultHandler(warning)
      },
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const moduleId = id.replaceAll("\\", "/")
          if (!moduleId.includes("/node_modules/")) return
          if (moduleId.includes("/powerbi-client/")) return "vendor-powerbi"
          if (moduleId.includes("/@tiptap/")) return "vendor-tiptap"
          if (moduleId.includes("/xlsx/")) return "vendor-xlsx"
          if (moduleId.includes("/pptxgenjs/") || moduleId.includes("/jspdf")) return "vendor-doc-export"
          if (moduleId.includes("/three/") || moduleId.includes("/@react-three/")) return "vendor-three"
          if (moduleId.includes("/recharts/")) return "vendor-recharts"
          if (moduleId.includes("/html2canvas/")) return "vendor-html2canvas"

          if (
            moduleId.includes("/react/") ||
            moduleId.includes("/react-dom/") ||
            moduleId.includes("/scheduler/")
          ) {
            return "vendor-react-core"
          }

          if (moduleId.includes("/react-router/") || moduleId.includes("/react-router-dom/")) {
            return "vendor-router"
          }

          if (
            moduleId.includes("/@tanstack/") ||
            moduleId.includes("/axios/") ||
            moduleId.includes("/@microsoft/signalr/")
          ) {
            return "vendor-data-runtime"
          }
        },
      },
    },
  },
  server: {
    allowedHosts,
    host: "0.0.0.0",
  },
})
