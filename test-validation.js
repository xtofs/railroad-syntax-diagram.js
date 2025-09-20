// Test the validation function with OData example content
const testStrings = [
    'textBox("segment-nz", "nonterminal")',
    'textBox("\":\"", "terminal")',
    'textBox("\"/\"", "terminal")', 
    'textBox("\"://\"", "terminal")',
    'sequence(textBox("host", "nonterminal"), bypass(textBox("port", "nonterminal")))'
];

// Copy the validation function from diagram.js for testing
function validateExpressionCode(code) {
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
    
    const allowedPattern = /^[\s\w(),:\/\-"'`+*.\[\]\\]+$/;
    if (!allowedPattern.test(cleanCode)) {
        throw new Error('Expression contains disallowed characters');
    }
    
    const allowedFunctions = ['textBox', 'sequence', 'stack', 'bypass', 'loop'];
    
    const functionCalls = cleanCode.match(/\b(\w+)\s*\(/g);
    if (functionCalls) {
        for (const call of functionCalls) {
            const funcName = call.replace(/\s*\(/, '');
            if (!allowedFunctions.includes(funcName)) {
                throw new Error(`Disallowed function call: ${funcName}`);
            }
        }
    }
    
    return true;
}

// Test each string
testStrings.forEach((testString, index) => {
    try {
        validateExpressionCode(testString);
        console.log(`✓ Test ${index + 1} passed: ${testString}`);
    } catch (error) {
        console.log(`✗ Test ${index + 1} failed: ${testString}`);
        console.log(`  Error: ${error.message}`);
    }
});