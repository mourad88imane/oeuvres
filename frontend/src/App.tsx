/**
 * APP — Point d'entrée de l'application React
 */
import { useEffect } from "react";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppRouter } from "./app/router";
import { queryClient } from "./app/queryClient";
import { ErrorBoundary } from "@shared/components/ui/ErrorBoundary";

function GlobalStyleInjector() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .ant-select { --ant-select-color: #000000 !important; }
      .ant-select-content { color: #000000 !important; font-size: 14px !important; position: relative !important; z-index: 2 !important; }
      .ant-select-content > span { color: #000000 !important; font-weight: 600 !important; }
      .ant-select-content-value { color: #000000 !important; font-size: 14px !important; }
      .ant-select-selector { background-color: #ffffff !important; }
      .ant-select-dropdown { background-color: #ffffff !important; }
      .ant-select-dropdown .ant-select-item-option-content { color: #000000 !important; }
      .ant-select-selection-placeholder { color: #9CA3AF !important; }
      .ant-select-single .ant-select-input { background: transparent !important; opacity: 0.01 !important; }
      .ant-select-content input { background: transparent !important; }
      .ant-select-selection-item { display: block !important; color: #000 !important; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  return null;
}

export function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === "ar" ? "rtl" : "ltr";

  return (
    <StyleProvider>
      <ConfigProvider
      direction={direction}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorText: "#000000",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
        },
        components: {
          Select: {
            colorText: "#000000",
            colorTextPlaceholder: "#8a8882",
            colorBgContainer: "#ffffff",
            controlItemBgHover: "#f5f5f5",
          },
          DatePicker: {
            colorText: "#000000",
            colorTextPlaceholder: "#8a8882",
            colorBgContainer: "#ffffff",
          },
          Input: {
            colorText: "#000000",
            colorTextPlaceholder: "#8a8882",
            colorBgContainer: "#ffffff",
          },
        },
      }}
    >
      <GlobalStyleInjector />
      <AntdApp>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AppRouter />
          </QueryClientProvider>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
    </StyleProvider>
  );
}
