# Quick Test Commands - EquityLens Integration Testing

Copy & paste these commands to verify frontend & backend are working.

## START HERE: 3-Minute Quick Test

### Terminal 1: Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Terminal 2: Quick Verification (after backend starts)
```bash
# Test 1: Backend Health Check (should respond in <100ms)
curl http://localhost:8000/api/demo/health

# Test 2: Get Sample Audit Data (should respond in <500ms)
curl http://localhost:8000/api/demo/sample-audit | jq '.fairness_score'
# Expected output: 68

# Test 3: Get API Endpoints List (verify all endpoints exist)
curl http://localhost:8000/api/demo/endpoints | jq '.categories | keys'

echo "✓ Backend is working!"
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev

# Then open http://localhost:5173 in your browser
# Check that page loads without errors
```

---

## COMPLETE TEST SUITE (All Tests)

### Run All Backend Tests
```bash
# Terminal with backend running
pytest backend/tests/test_integration.py -v

# Expected: All 14 tests pass in ~2-3 seconds
```

### Run All Frontend E2E Tests
```bash
# Terminal with both backend and frontend running
npx playwright test integration-test.spec.ts

# Expected: All 12 tests pass in ~7-8 seconds
```

---

## Individual Component Tests

### Test 1: Health Check
```bash
curl http://localhost:8000/api/demo/health

# ✅ Expected Response:
# {
#   "status": "healthy",
#   "service": "EquityLens",
#   ...
# }
```

### Test 2: Sample Audit Data
```bash
curl http://localhost:8000/api/demo/sample-audit | jq

# ✅ Look for:
# - .fairness_score = 68
# - .metrics.gender.flagged = true
# - .proxy_features has HIGH/MEDIUM severity
# - .intersectional_results shows disparities
```

### Test 3: HTML Report Generation
```bash
curl http://localhost:8000/api/demo/sample-report -o report.html

# ✅ Open report.html in browser and look for:
# - Title: "Fairness Audit Report"
# - Fairness Score: "68/100"
# - Section: "Executive Summary"
# - Section: "Key Metrics"
# - Section: "Proxy Features"
# - Section: "Recommendations"
```

### Test 4: Model Card (Transparency Doc)
```bash
curl http://localhost:8000/api/demo/sample-model-card | jq -r '.content'

# ✅ Look for sections:
# - Model Details
# - Intended Use
# - Training Data
# - Model Limitations
# - Ethical Considerations
```

### Test 5: API Endpoints Reference
```bash
curl http://localhost:8000/api/demo/endpoints | jq '.categories | keys[]'

# ✅ Should list 8 categories:
# - Health & Demo
# - Datasets
# - Audit & Analysis
# - Mitigation
# - Simulator
# - Portal
# - Governance
# - Reports & Transparency
```

---

## Performance Checks

### Check Response Times
```bash
# Create a simple performance test script
cat > perf_test.sh << 'EOF'
echo "Measuring API response times..."
echo "==============================="

time curl http://localhost:8000/api/demo/health > /dev/null
echo "Health check:"

time curl http://localhost:8000/api/demo/sample-audit > /dev/null
echo "Sample audit:"

time curl http://localhost:8000/api/demo/sample-report > /dev/null
echo "Sample report:"

time curl http://localhost:8000/api/demo/sample-model-card > /dev/null
echo "Sample model card:"
EOF

bash perf_test.sh

# ✅ All should complete in <1 second each
```

---

## Frontend Integration Tests

### Test 1: Load Frontend Page
```bash
# In browser console (http://localhost:5173):
console.log("Checking if frontend loaded...")
document.title  // Should show app title
```

### Test 2: Navigate to Transparency Page
```
1. Open http://localhost:5173/transparency
2. Page should load without errors
3. If no analysis exists, should show "No analysis to display"
```

### Test 3: Test API Client Methods
```bash
# In browser console (after navigating to page):
ApiClient.generateAuditReport('audit-sample-001', 'json')
  .then(report => console.log("Report generated:", report.status))

ApiClient.getModelCardMarkdown('audit-sample-001')
  .then(card => console.log("Card loaded:", card.length, "chars"))

ApiClient.exportAuditData('audit-sample-001', 'summary')
  .then(data => console.log("Export data:", data))
```

---

## Automated Test Suites

### Option A: Run Backend Tests Only
```bash
cd backend
pytest tests/test_integration.py -v

# Output should show:
# test_health_check PASSED ✓
# test_sample_audit_data PASSED ✓
# test_sample_report_html PASSED ✓
# test_sample_model_card PASSED ✓
# [... 10 more ...]
# ============= 14 passed in 2.34s =============
```

### Option B: Run Frontend E2E Tests Only
```bash
cd frontend
npx playwright test integration-test.spec.ts

# Output should show:
# 1. Backend Health Check ✓
# 2. Get Sample Audit Data ✓
# 3. Get Sample Report (HTML) ✓
# [... 9 more ...]
# ============= 12 passed (7.8s) =============
```

### Option C: Run All Tests
```bash
# Backend tests
cd backend && pytest tests/test_integration.py -v

# Frontend tests
cd frontend && npx playwright test integration-test.spec.ts

# Both should pass completely
```

---

## Debugging Failed Tests

### If Backend Test Fails
```bash
# Check backend is actually running
curl http://localhost:8000/api/demo/health

# Run test with verbose output
pytest backend/tests/test_integration.py::TestHealthAndDemo::test_health_check -v -s

# Check backend logs for errors
# (Look in terminal where backend is running)
```

### If Frontend Test Fails
```bash
# Check frontend is running
open http://localhost:5173

# Run test with verbose output
npx playwright test integration-test.spec.ts --reporter=verbose

# Check browser console for errors
# (Press F12 to open developer tools)
```

### If API Call Fails
```bash
# Test CORS headers
curl -i http://localhost:8000/api/demo/health

# Should see:
# HTTP/1.1 200 OK
# access-control-allow-origin: *
# (or your configured origin)
```

---

## Expected Test Results

### ✅ SUCCESS: System is Working Properly
```
✓ Backend health check returns status="healthy"
✓ Sample audit data loads in <500ms
✓ HTML report contains all sections
✓ Model card markdown is properly formatted
✓ API endpoints documented
✓ Frontend loads without errors
✓ Navigation works
✓ Transparency page accessible
✓ All 26 tests pass
✓ No error messages in console
✓ Response times under 1 second
✓ CORS headers present
```

### ❌ FAILURE: Needs Debugging
```
If any test fails:
1. Check backend is running (curl http://localhost:8000/api/demo/health)
2. Check frontend is running (open http://localhost:5173)
3. Check no port conflicts (lsof -i :8000)
4. Check environment variables set correctly
5. Review error message in test output
6. Check terminal logs where server is running
```

---

## Common Test Commands Reference

| Command | Purpose | Expected Time |
|---------|---------|---|
| `curl http://localhost:8000/api/demo/health` | Backend alive check | <100ms |
| `curl http://localhost:8000/api/demo/sample-audit \| jq` | Get test data | <500ms |
| `curl http://localhost:8000/api/demo/sample-report -o r.html` | Get HTML report | <1s |
| `pytest backend/tests/test_integration.py -v` | All backend tests | ~2-3s |
| `npx playwright test integration-test.spec.ts` | All frontend tests | ~7-8s |

---

## Summary

If all commands below succeed, your system is **100% working**:

```bash
# Test 1: Backend Health
curl http://localhost:8000/api/demo/health
# ✓ Returns status: "healthy"

# Test 2: Sample Data
curl http://localhost:8000/api/demo/sample-audit | jq '.fairness_score'
# ✓ Returns: 68

# Test 3: Report Generation  
curl http://localhost:8000/api/demo/sample-report | grep "Fairness Audit Report"
# ✓ Returns matching string

# Test 4: Run Full Test Suite
pytest backend/tests/test_integration.py -v
# ✓ All 14 tests pass

# Test 5: Frontend Access
open http://localhost:5173
# ✓ Page loads without errors
```

**If all 5 checks pass → System is working correctly! ✅**

---

For detailed documentation, see [TESTING_GUIDE.md](TESTING_GUIDE.md)
