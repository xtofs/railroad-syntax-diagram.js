// Test the validation function with OData example content
const testCases = [
    // Tests that should PASS validation
    { code: 'textBox("segment-nz", "nonterminal")', shouldPass: true },
    { code: 'textBox(":", "terminal")', shouldPass: true },
    { code: 'textBox("/", "terminal")', shouldPass: true },
    { code: 'textBox("://", "terminal")', shouldPass: true },
    { code: 'sequence(textBox("host", "nonterminal"), bypass(textBox("port", "nonterminal")))', shouldPass: true },
    { code: 'textBox("MultiLineString(", "terminal")', shouldPass: true, comment: 'Test case for the reported issue - should pass' },
    { code: 'textBox("someFunc(", "terminal")', shouldPass: true },
    { code: 'textBox("anotherFunc)", "terminal")', shouldPass: true },
    { code: 'textBox("Function(malicious)", "terminal")', shouldPass: true, comment: 'Function keyword in string - should pass' },
    { code: 'textBox("eval(code)", "terminal")', shouldPass: true, comment: 'eval in string - should pass' },
    { code: 'textBox("$filter", "terminal")', shouldPass: true, comment: 'Dollar sign in string' },
    { code: 'textBox("complex(nested(parens))", "terminal")', shouldPass: true, comment: 'Nested parens in string' },
    { code: 'textBox("string with (parens) inside", "terminal")', shouldPass: true },
    
    // Tests that should FAIL validation (security checks)
    { code: 'badFunction("test")', shouldPass: false, comment: 'Should fail - disallowed function' },
    { code: 'eval("dangerous")', shouldPass: false, comment: 'Should fail - dangerous function' },
    { code: 'MultiLineString("test")', shouldPass: false, comment: 'Should fail - looks like function call outside string' },
];

// Import the validation functions from diagram.js
const { validateExpressionCode, tokenize, TokenType } = require('./diagram.js');

// Test each case with clear pass/fail expectations
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log('🧪 Railroad Diagram Validation Tests\n');

testCases.forEach((testCase, index) => {
    totalTests++;
    const { code, shouldPass, comment } = testCase;
    
    try {
        validateExpressionCode(code);
        
        if (shouldPass) {
            console.log(`✅ Test ${index + 1}: PASSED (as expected)`);
            console.log(`   Code: ${code}`);
            if (comment) console.log(`   Note: ${comment}`);
            passedTests++;
        } else {
            console.log(`❌ Test ${index + 1}: FAILED (validation should have rejected this code)`);
            console.log(`   Code: ${code}`);
            console.log(`   Expected: Validation should fail`);
            console.log(`   Actual: Validation passed`);
            if (comment) console.log(`   Note: ${comment}`);
            failedTests++;
        }
        
    } catch (error) {
        if (!shouldPass) {
            console.log(`✅ Test ${index + 1}: PASSED (correctly rejected invalid code)`);
            console.log(`   Code: ${code}`);
            console.log(`   Rejected with: ${error.message}`);
            if (comment) console.log(`   Note: ${comment}`);
            passedTests++;
        } else {
            console.log(`❌ Test ${index + 1}: FAILED (validation incorrectly rejected valid code)`);
            console.log(`   Code: ${code}`);
            console.log(`   Expected: Validation should pass`);
            console.log(`   Actual: ${error.message}`);
            if (comment) console.log(`   Note: ${comment}`);
            failedTests++;
        }
    }
    
    console.log(''); // Empty line for readability
});

// Summary
console.log('📊 Test Summary');
console.log('================');
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
    console.log('🎉 All tests passed!');
} else {
    console.log(`⚠️  ${failedTests} test(s) failed`);
    process.exit(1);
}