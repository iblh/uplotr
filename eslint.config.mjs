import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
    ...nextVitals,
    ...nextTypescript,
    {
        rules: {
            // Vendor mapping payloads are intentionally schema-less at this boundary.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
    globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts']),
]);
