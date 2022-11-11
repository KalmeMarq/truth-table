type TokenKind =
 | 'Variable'
 | 'Negate'      // -
 | 'Or'          // v
 | 'And'         // ^
 | 'Equivalent'  // <->
 | 'Conditional' // ->
 | 'LeftParen'   // ()
 | 'RightParen'  // )
 | 'EOF'

interface Token {
  kind: TokenKind,
  raw: string
}

function tokenize(content: string) {
  const tokens: Token[] = [];

  let cursor = 0;

  while (cursor < content.length) {
    if (content[cursor] === ' ' || content[cursor] === '\n' || content[cursor] === '\t' || content[cursor] === '\r') {
    } else if (content[cursor] === '(') {
      tokens.push({
        kind: 'LeftParen',
        raw: '('
      })
    } else if (content[cursor] === ')') {
      tokens.push({
        kind: 'RightParen',
        raw: ')'
      })
    } else if (content[cursor] === '-' && content[cursor + 1] === '>') {
      ++cursor;
      tokens.push({
        kind: 'Conditional',
        raw: '->'
      })
    } else if (content[cursor] === '<' && content[cursor + 1] === '-' && content[cursor + 2] === '>') {
      ++cursor;
      ++cursor;
      tokens.push({
        kind: 'Equivalent',
        raw: '<->'
      })
    } else if (content[cursor] === '-') {
      tokens.push({
        kind: 'Negate',
        raw: '-'
      })
    } else if (content[cursor].toLowerCase() === 'v') {
      tokens.push({
        kind: 'Or',
        raw: 'v'
      })
    } else if (content[cursor] === '^') {
      tokens.push({
        kind: 'And',
        raw: '^'
      })
    } else if (content[cursor] === '^') {
      tokens.push({
        kind: 'And',
        raw: '^'
      })
    } else if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(content[cursor])) {
      tokens.push({
        kind: 'Variable',
        raw: content[cursor]
      })
    } else {
      console.log(`%cUnknown token ${content[cursor]}`, 'color: red;');
      Deno.exit(1);
    }

    ++cursor;
  }

  tokens.push({
    kind: 'EOF',
    raw: ''
  })

  return tokens;
}

type Expr = {
  type: 'Variable';
  value: string;
} | {
  type: 'Negation';
  expr: Expr;
} | {
  type: 'And' | 'Or' | 'Condition' | 'Equivalence';
  left: Expr;
  right: Expr;
}

function parse(tokens: Token[]) {
  let cursor = 0;

  const exprs: Expr[] = []; 

  const parseExpr = (): Expr => {
    if (tokens[cursor].kind === 'Negate') {
      ++cursor;
      return {
        type: 'Negation',
        expr: parseExpr()
      };
    } else if (tokens[cursor].kind === 'Variable') {
      return {
        type: 'Variable',
        value: tokens[cursor].raw
      }
    } else if (tokens[cursor].kind === 'Conditional') {
      ++cursor;
      return {
        type: 'Condition',
        left: exprs.pop()!,
        right: parseExpr()
      }
    } else if (tokens[cursor].kind === 'Or') {
      ++cursor;
      return {
        type: 'Or',
        left: exprs.pop()!,
        right: parseExpr()
      }
    } else if (tokens[cursor].kind === 'And') {
      ++cursor;
      return {
        type: 'And',
        left: exprs.pop()!,
        right: parseExpr()
      }
    } else if (tokens[cursor].kind === 'Equivalent') {
      ++cursor;
      return {
        type: 'Equivalence',
        left: exprs.pop()!,
        right: parseExpr()
      }
    } else if (tokens[cursor].kind === 'LeftParen') {
      ++cursor;

      while (tokens[cursor].kind !== 'RightParen' && tokens[cursor].kind !== 'EOF') {
        exprs.push(parseExpr());
        ++cursor;
      }

      return exprs.pop()!;
    } else {
      throw new Error('bruh: ' + tokens[cursor].kind)
    }
  }

  while (tokens[cursor].kind !== 'EOF') {
    exprs.push(parseExpr());
    
    ++cursor;
  }

  return exprs[0];
}

function printHelp() {
  console.log(' ')
  console.log(' -------- Help ---------');
  console.log('  Negate          -');
  console.log('  And             ^');
  console.log('  Or              v');
  console.log('  Conditional     ->');
  console.log('  Equivalent      <->');
  console.log('');
}

function exprToString(expr: Expr, topLevel = true): string {
  if (expr.type === 'Variable') {
    return expr.value;
  } else if (expr.type === 'Negation') {
    return `-${exprToString(expr.expr, false)}`;
  } else if (expr.type === 'And') {
    return (!topLevel ? '(' : '') + `${exprToString(expr.left, false)} ^ ${exprToString(expr.right, false)}` + (!topLevel ? ')' : '')
  } else if (expr.type === 'Or') {
    return (!topLevel ? '(' : '') + `${exprToString(expr.left, false)} v ${exprToString(expr.right, false)}` + (!topLevel ? ')' : '')
  } else if (expr.type === 'Condition') {
    return (!topLevel ? '(' : '') + `${exprToString(expr.left, false)} -> ${exprToString(expr.right, false)}` + (!topLevel ? ')' : '')
  } else if (expr.type === 'Equivalence') {
    return (!topLevel ? '(' : '') + `${exprToString(expr.left, false)} <-> ${exprToString(expr.right, false)}` + (!topLevel ? ')' : '')
  }

  return ''
}

while (true) {
  Deno.stdout.writeSync(new TextEncoder().encode('> '));

  let data = new Uint8Array(65536)
  let length = Deno.stdin.readSync(data) ?? 0;

  const content = new TextDecoder().decode(data.subarray(0, length)).replace('\n', '').trim();

  if (content === 'help') {
    printHelp();
  } else if (content === 'exit') {
    Deno.exit(0);
  } else {
    const tokens = tokenize(content);

    if (tokens.length > 0) {
      const expr = parse(tokens);

      const vars = new Set<string>();

      const indExprs: Expr[] = [];
      
      const getVars = (expr: Expr) => {
        if (expr.type === 'Variable') {
          vars.add(expr.value);
        } else if (expr.type === 'Negation') {
          getVars(expr.expr);
        } else {
          getVars(expr.left);
          getVars(expr.right);
        }
      }

      getVars(expr);

      const getIndExprs = (expr: Expr) => {
        if (expr.type === 'Negation') {
          indExprs.push(expr);
        } else if (expr.type === 'Variable') {
        } else {
          getIndExprs(expr.left);
          getIndExprs(expr.right);
          indExprs.push(expr);
        }
      }

      getIndExprs(expr);

      let indExprsWids: number[] = []

      {
        let head = '|' + Array.from(vars.values()).map(v => ' ' + v).join(' |') + ' |';
        if (indExprs.length > 0) {
          head += indExprs.map(v => {
            const str = exprToString(v);
            indExprsWids.push(str.split('').length);
            return ' ' + str;
          }).join(' |') + ' |';
        }

        console.log(head);
        console.log('-'.repeat(head.length));

        type RowContext = {
          variables: Record<string, string> 
        }

        type Row = {
          vars: string[],
          exprs: {
            expr: Expr,
            value: string;
          }[]
        }

        const rows: Row[] = []; 

        const rowsCount = Math.pow(2, vars.size);
        const tempAr: number[] = new Array(vars.size).fill(0);

        for (let r = 0; r < rowsCount; ++r) {
          const row: Row = {
            vars: [],
            exprs: [] 
          };

          for (let c = 0; c < vars.size; ++c) {
            const sep =  Math.pow(2, vars.size - 1 -c );

            row.vars.push((Math.floor(r / sep)) % 2 === 0 ? 'T' : 'F')            
          }

          rows.push(row)
        }

        function evaluateExpr(expr: Expr, context: RowContext): string {
          if (expr.type === 'Variable') {
            return context.variables[expr.value];
          } else if (expr.type === 'Negation') {
            return evaluateExpr(expr.expr, context) === 'T' ? 'F' : 'T';
          } else if (expr.type === 'And') {
            const left = evaluateExpr(expr.left, context);
            const right = evaluateExpr(expr.right, context);
            return left + right === 'TT' ? 'T' : 'F';
          } else if (expr.type === 'Or') {
            const left = evaluateExpr(expr.left, context);
            const right = evaluateExpr(expr.right, context);
            return left === 'T' || right === 'T' ? 'T' : 'F';
          } else if (expr.type === 'Condition') {
            const left = evaluateExpr(expr.left, context);
            const right = evaluateExpr(expr.right, context);
            return left === 'T' && right === 'F' ? 'F' : 'T';
          } else if (expr.type === 'Equivalence') {
            const left = evaluateExpr(expr.left, context);
            const right = evaluateExpr(expr.right, context);
            return left + right === 'TT' || left + right === 'FF' ? 'T' : 'F';
          }

          return 'F';
        } 

        for (let r = 0; r < rows.length; ++r) {
          const varss: Record<string, string> = {};

          rows[r].vars.forEach((v, i) => {
            varss[Array.from(vars.values())[i]] = v
          })

          rows[r].exprs.push(...indExprs.map(v => {
            return { expr: v, value: evaluateExpr(v, { variables: varss } ) }
          }));
        }
        
        for (let r = 0; r < rows.length; ++r) {
          let str = '|' + rows[r].vars.map(v => ' ' + v).join(' |') + ' |';

          if (indExprs.length > 0) {
            str += rows[r].exprs.map((v, i) => {
              const ww: number = indExprsWids[i];
              return ' '.repeat(Math.ceil(ww / 2) + (ww % 2 === 0 ? 1 : 0)) + v.value + ' '.repeat(Math.ceil(ww / 2))
            }).join('|') + '|'
          }

          console.log(str);
        }
      }
    }
  }
}
