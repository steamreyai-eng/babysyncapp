const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/screens/RoutineScreen.tsx', 'utf8');

const plugin = function ({ types: t }) {
  return {
    visitor: {
      Program(path) {
        // Add imports
        path.node.body.unshift(
          t.importDeclaration([t.importSpecifier(t.identifier('Wrapper'), t.identifier('Wrapper'))], t.stringLiteral('../components/ui/Wrapper')),
          t.importDeclaration([t.importSpecifier(t.identifier('Surface'), t.identifier('Surface'))], t.stringLiteral('../components/ui/Surface')),
          t.importDeclaration([t.importSpecifier(t.identifier('Typography'), t.identifier('Typography'))], t.stringLiteral('../components/ui/Typography'))
        );
      },
      ImportDeclaration(path) {
        if (path.node.source.value === 'react-native') {
          path.node.specifiers = path.node.specifiers.filter(spec => 
            spec.imported && !['View', 'Text', 'StyleSheet'].includes(spec.imported.name)
          );
        }
      },
      VariableDeclaration(path) {
        // Remove StyleSheet.create
        if (
          path.node.declarations.length > 0 &&
          path.node.declarations[0].id &&
          path.node.declarations[0].id.name === 'styles'
        ) {
          path.remove();
        }
      },
      MemberExpression(path) {
        if (t.isIdentifier(path.node.object, { name: 'StyleSheet' }) && t.isIdentifier(path.node.property, { name: 'absoluteFill' })) {
            path.replaceWith(t.objectExpression([
               t.objectProperty(t.identifier('position'), t.stringLiteral('absolute')),
               t.objectProperty(t.identifier('top'), t.numericLiteral(0)),
               t.objectProperty(t.identifier('left'), t.numericLiteral(0)),
               t.objectProperty(t.identifier('right'), t.numericLiteral(0)),
               t.objectProperty(t.identifier('bottom'), t.numericLiteral(0))
            ]));
        }
      },
      JSXElement(path) {
        const opening = path.node.openingElement;
        const name = opening.name;

        if (!t.isJSXIdentifier(name)) return;

        if (name.name === 'View') {
          name.name = 'Wrapper';
          if (path.node.closingElement) path.node.closingElement.name.name = 'Wrapper';
          
          // Check if it has styles.card
          const styleAttr = opening.attributes.find(a => t.isJSXAttribute(a) && a.name.name === 'style');
          if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
            let expr = styleAttr.value.expression;
            let isCard = false;
            let otherStyles = null;

            if (t.isArrayExpression(expr)) {
               const newElements = [];
               expr.elements.forEach(el => {
                 if (t.isMemberExpression(el) && t.isIdentifier(el.object, { name: 'styles' }) && t.isIdentifier(el.property, { name: 'card' })) {
                   isCard = true;
                 } else {
                   newElements.push(el);
                 }
               });
               otherStyles = newElements.length > 1 ? t.arrayExpression(newElements) : newElements[0];
            } else if (t.isMemberExpression(expr) && t.isIdentifier(expr.object, { name: 'styles' }) && t.isIdentifier(expr.property, { name: 'card' })) {
              isCard = true;
            }

            if (isCard) {
              name.name = 'Surface';
              if (path.node.closingElement) path.node.closingElement.name.name = 'Surface';
              
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('bg'), t.stringLiteral('white')));
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('radius'), t.stringLiteral('xxl')));
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('variant'), t.stringLiteral('elevated')));
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('borderWidth'), t.jsxExpressionContainer(t.numericLiteral(1))));
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('borderColor'), t.stringLiteral('#F0ECE8')));
              
              const shadowStyles = t.objectExpression([
                t.objectProperty(t.identifier('shadowColor'), t.stringLiteral('#000')),
                t.objectProperty(t.identifier('shadowOffset'), t.objectExpression([t.objectProperty(t.identifier('width'), t.numericLiteral(0)), t.objectProperty(t.identifier('height'), t.numericLiteral(4))])),
                t.objectProperty(t.identifier('shadowOpacity'), t.numericLiteral(0.04)),
                t.objectProperty(t.identifier('shadowRadius'), t.numericLiteral(16)),
                t.objectProperty(t.identifier('elevation'), t.numericLiteral(2))
              ]);

              if (otherStyles) {
                styleAttr.value.expression = t.arrayExpression([shadowStyles, otherStyles]);
              } else {
                styleAttr.value.expression = shadowStyles;
              }
            }
          }
        } else if (name.name === 'Text') {
          name.name = 'Typography';
          if (path.node.closingElement) path.node.closingElement.name.name = 'Typography';
          
          let variant = 'body';
          let weight = undefined;

          const styleAttr = opening.attributes.find(a => t.isJSXAttribute(a) && a.name.name === 'style');
          if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
             let expr = styleAttr.value.expression;
             if (t.isObjectExpression(expr)) {
                expr.properties.forEach(prop => {
                   if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'fontFamily' }) && t.isStringLiteral(prop.value)) {
                      if (prop.value.value.includes('900Black')) weight = 'black';
                      if (prop.value.value.includes('800ExtraBold')) weight = 'extraBold';
                      if (prop.value.value.includes('700Bold')) weight = 'bold';
                      if (prop.value.value.includes('600SemiBold')) weight = 'semiBold';
                   }
                });
             } else if (t.isArrayExpression(expr)) {
                expr.elements.forEach(el => {
                   if (t.isObjectExpression(el)) {
                      el.properties.forEach(prop => {
                         if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'fontFamily' }) && t.isStringLiteral(prop.value)) {
                            if (prop.value.value.includes('900Black')) weight = 'black';
                            if (prop.value.value.includes('800ExtraBold')) weight = 'extraBold';
                            if (prop.value.value.includes('700Bold')) weight = 'bold';
                            if (prop.value.value.includes('600SemiBold')) weight = 'semiBold';
                         }
                      });
                   }
                });
             }
          }

          opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('variant'), t.stringLiteral(variant)));
          if (weight) opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('weight'), t.stringLiteral(weight)));
        }
      }
    }
  };
};

const output = babel.transformSync(code, {
  filename: 'RoutineScreen.tsx',
  presets: ['@babel/preset-typescript'],
  plugins: [plugin],
  retainLines: true,
});

fs.writeFileSync('src/screens/RoutineScreen.tsx', output.code);
