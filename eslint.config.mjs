import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "worker-configuration.d.ts",
  ]),

  {
    files: [
      "components/ui/**/*.{ts,tsx}",
      "hooks/use-mobile.ts",
    ],

    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    files: ["components/store/store.tsx"],

    rules: {
      /*
       * O componente inicializa informações do endereço e do
       * carrinho, que são sistemas externos ao React.
       */
      "react-hooks/set-state-in-effect": "off",

      /*
       * Links com recarregamento completo são intencionais
       * neste componente executado pelo Vinext.
       */
      "@next/next/no-html-link-for-pages": "off",

      /*
       * As imagens são URLs dinâmicas administradas no
       * Supabase Storage.
       */
      "@next/next/no-img-element": "off",
    },
  },

  {
    files: [
      "components/store/admin.tsx",
      "components/store/supabase-admin-login.tsx",
    ],

    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;