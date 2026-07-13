import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const TAILWIND_HEX_PREFIXES = [
  'bg', 'text', 'from', 'to', 'border', 'shadow',
  'ring', 'fill', 'stroke', 'decoration', 'divide',
];

// Match Tailwind arbitrary hex class: <prefix>-[#xxxxxx]
const TAILWIND_HEX_RE = new RegExp(
  '\\b(' + TAILWIND_HEX_PREFIXES.join('|') + ')-\\[#([0-9a-fA-F]{3,8})\\]',
  'g'
);

const NO_HEX_COLORS_RULE = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct hex colors in className strings',
    },
    messages: {
      hexColor:
        'Direct hex color "{{hex}}" in className. Use a Tailwind token (e.g. bg-primary) instead. See docs/brand/VI_DESIGN_TOKENS.md',
    },
    fixable: null,
    schema: [],
  },
  create(context) {
    const source = context.filename || '';
    if (source.endsWith('.css') || source.endsWith('.module.css')) {
      return {};
    }

    function scanString(value, node) {
      TAILWIND_HEX_RE.lastIndex = 0;
      let m;
      while ((m = TAILWIND_HEX_RE.exec(value)) !== null) {
        const hex = m[2];
        context.report({
          node,
          loc: {
            start: {
              line: node.loc.start.line,
              column: node.loc.start.column + m.index,
            },
            end: {
              line: node.loc.start.line,
              column: node.loc.start.column + m.index + m[0].length,
            },
          },
          messageId: 'hexColor',
          data: { hex: '#' + hex },
        });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const value = node.value;
        if (!value) return;

        function scanExpr(expr) {
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            scanString(expr.value, expr);
          } else if (
            expr.type === 'JSXExpressionContainer' &&
            expr.expression.type === 'Literal' &&
            typeof expr.expression.value === 'string'
          ) {
            scanString(expr.expression.value, expr.expression);
          } else if (
            expr.type === 'JSXExpressionContainer' &&
            expr.expression.type === 'TemplateLiteral'
          ) {
            for (const part of expr.expression.expressions) {
              scanExpr(part);
            }
          }
        }

        scanExpr(value);
      },
    };
  },
};

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'JapaneseD/**',
      'build/**',
      'coverage/**',
      'out/**',
      'public/**',
      'scripts/**',
      '*.js',
      // Demo page uses a custom palette that is not part of the production
      // VI design system. Excluded from lint to avoid forcing design-token
      // migration onto throwaway demo UI.
      // See: components/demo/FeriaDemoApp.tsx (legacy brand showcase)
      'components/demo/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      'no-hex-colors': {
        rules: {
          'no-hex-colors': NO_HEX_COLORS_RULE,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'no-hex-colors/no-hex-colors': 'error',
    },
  },
];

export default eslintConfig;
