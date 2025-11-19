# Security Implementation Checklist

Quick reference checklist for implementing security fixes. Check off items as you complete them.

---

## 🔴 CRITICAL - Before Production (P0)

Must be completed before deploying to production.

### Security Headers
- [ ] Update `next.config.ts` with security headers
- [ ] Add Content-Security-Policy (CSP)
- [ ] Add X-Frame-Options (clickjacking protection)
- [ ] Add X-Content-Type-Options (MIME sniffing protection)
- [ ] Add Strict-Transport-Security (HSTS)
- [ ] Test headers with securityheaders.com
- [ ] Verify CSP doesn't break functionality
- **Time:** 4 hours | **File:** `next.config.ts`

### Rate Limiting
- [ ] Create `lib/rate-limiter.ts`
- [ ] Create database migration `004_rate_limiting.sql`
- [ ] Update `middleware.ts` with rate limiting
- [ ] Configure different limits for different endpoints
- [ ] Test rate limiting with curl/Postman
- [ ] Add rate limit headers to responses
- **Time:** 8 hours | **Files:** `lib/rate-limiter.ts`, `middleware.ts`, `supabase/migrations/004_rate_limiting.sql`

### Error Message Sanitization
- [ ] Create `lib/error-handler.ts`
- [ ] Update all API routes to use safe error handler
- [ ] Remove `details` from error responses in production
- [ ] Test error messages don't leak sensitive info
- [ ] Verify errors are logged internally
- **Time:** 4 hours | **Files:** `lib/error-handler.ts`, all API routes

### CSRF Protection
- [ ] Install `@edge-csrf/nextjs`
- [ ] Create `lib/csrf.ts`
- [ ] Update `middleware.ts` with CSRF validation
- [ ] Create `lib/csrf-context.tsx`
- [ ] Create `app/api/csrf-token/route.ts`
- [ ] Update `app/layout.tsx` with CsrfProvider
- [ ] Update all forms to include CSRF token
- [ ] Test CSRF protection with missing token
- **Time:** 6 hours | **Files:** Multiple

**Total P0 Time: ~22 hours (~3 days)**

---

## 🟠 HIGH PRIORITY (P1)

Should be completed within 1 week of production deployment.

### Authorization Fix
- [ ] Remove `evaluator_id` parameter from GET `/api/evaluations`
- [ ] Test users can only access their own data
- [ ] Verify RLS policies are working
- **Time:** 2 hours | **File:** `app/api/evaluations/route.ts`

### Input Validation
- [ ] Create `lib/schemas/validation.ts`
- [ ] Add length limits to message schema (max 5000 chars)
- [ ] Add length limits to notes schema (max 2000 chars)
- [ ] Add time_spent validation (max 24 hours)
- [ ] Update all API routes to use enhanced schemas
- [ ] Test with edge cases (empty, too long, special chars)
- **Time:** 4 hours | **Files:** `lib/schemas/validation.ts`, API routes

### XSS Prevention
- [ ] Install `isomorphic-dompurify`
- [ ] Create `lib/sanitize.ts`
- [ ] Update `components/chat-interface.tsx`
- [ ] Update `components/transcript-viewer.tsx`
- [ ] Update `components/evaluation-display.tsx`
- [ ] Test with XSS payloads (`<script>alert('xss')</script>`)
- **Time:** 4 hours | **Files:** `lib/sanitize.ts`, components

### Audit Logging
- [ ] Create database migration `005_audit_logging.sql`
- [ ] Create `lib/audit-logger.ts`
- [ ] Add audit logging to authentication events
- [ ] Add audit logging to evaluation creation
- [ ] Add audit logging to transcript viewing
- [ ] Add audit logging to data exports
- [ ] Test audit logs are created
- [ ] Create admin view for audit logs (optional)
- **Time:** 8 hours | **Files:** `lib/audit-logger.ts`, `supabase/migrations/005_audit_logging.sql`, API routes

**Total P1 Time: ~18 hours (~2-3 days)**

---

## 🟡 MEDIUM PRIORITY (P2)

Should be completed within 2-3 weeks.

### Database Constraints
- [ ] Create migration `006_additional_constraints.sql`
- [ ] Add unique constraint on (transcript_id, evaluator_id)
- [ ] Add check constraints on scores
- [ ] Add check constraints on session status
- [ ] Add check constraints on time_spent
- [ ] Test constraints work
- **Time:** 1 hour | **File:** `supabase/migrations/006_additional_constraints.sql`

### Production Logging
- [ ] Create `lib/logger.ts`
- [ ] Replace all `console.log` with `logger.info`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Test sensitive data is redacted
- [ ] Configure log aggregation service (optional)
- **Time:** 3 hours | **Files:** `lib/logger.ts`, all files with console logs

### Data Retention
- [ ] Define data retention policy (90 days recommended)
- [ ] Create cleanup function in migration
- [ ] Schedule cleanup job (pg_cron or external)
- [ ] Add user data export functionality
- [ ] Test cleanup function
- **Time:** 6 hours | **Files:** Database migrations, admin scripts

### Session Management
- [ ] Create user_sessions table
- [ ] Track concurrent sessions
- [ ] Add force logout functionality
- [ ] Add session activity monitoring
- [ ] Test session tracking
- **Time:** 8 hours | **Files:** Database migrations, API routes

**Total P2 Time: ~18 hours (~2-3 days)**

---

## 🟢 LOW PRIORITY (P3)

Can be completed within 1-2 months.

### Documentation
- [ ] Write privacy policy
- [ ] Write terms of service
- [ ] Create security.txt file
- [ ] Document security procedures
- [ ] Create incident response plan
- **Time:** 4 hours

### Dependency Management
- [ ] Review React 19 stability
- [ ] Consider pinning to React 18 if unstable
- [ ] Set up Dependabot
- [ ] Create dependency update schedule
- [ ] Document dependency policy
- **Time:** 2 hours

### MFA (Optional)
- [ ] Enable Supabase MFA
- [ ] Update authentication flow
- [ ] Test MFA enrollment
- [ ] Document MFA for users
- **Time:** 6 hours

### Health Check
- [ ] Create `/api/health` endpoint
- [ ] Check database connectivity
- [ ] Check external API connectivity
- [ ] Set up uptime monitoring
- **Time:** 2 hours

**Total P3 Time: ~14 hours (~1-2 days)**

---

## Verification & Testing

After implementing fixes, verify with these tests:

### Automated Tests
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `npm run lint` and fix issues
- [ ] Run `npm run build` successfully
- [ ] Test all API endpoints work
- [ ] Test authentication flow

### Manual Security Tests
- [ ] Test headers with [securityheaders.com](https://securityheaders.com/)
- [ ] Test CSP with browser developer console
- [ ] Test rate limiting with rapid requests
- [ ] Test CSRF by removing token
- [ ] Test authorization by accessing other user's data
- [ ] Test input validation with edge cases
- [ ] Test XSS with payloads
- [ ] Test error messages are generic

### Penetration Testing (Recommended)
- [ ] SQL injection testing (use sqlmap)
- [ ] XSS testing (use XSStrike)
- [ ] Authentication bypass testing
- [ ] Session hijacking testing
- [ ] IDOR testing
- [ ] Rate limit bypass testing

---

## Deployment Checklist

Before deploying to production:

### Pre-Deployment
- [ ] All P0 (CRITICAL) items completed
- [ ] All database migrations tested in staging
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CSRF protection active
- [ ] Error messages sanitized
- [ ] Dependencies updated
- [ ] `npm audit` clean (or documented exceptions)

### Deployment
- [ ] Backup production database
- [ ] Run database migrations
- [ ] Deploy application
- [ ] Verify environment variables
- [ ] Test critical user flows

### Post-Deployment
- [ ] Verify security headers in production
- [ ] Test rate limiting works
- [ ] Monitor error logs for 24 hours
- [ ] Check audit logs are being created
- [ ] Verify SSL/TLS configuration
- [ ] Test authentication flow
- [ ] Monitor performance metrics

---

## Ongoing Security Tasks

### Daily
- [ ] Review error logs
- [ ] Check audit logs for suspicious activity
- [ ] Monitor rate limit violations

### Weekly
- [ ] Review new authentication attempts
- [ ] Check for failed authorization attempts
- [ ] Review data export logs

### Monthly
- [ ] Run `npm audit` and update dependencies
- [ ] Review and rotate API keys (if needed)
- [ ] Check for new security advisories
- [ ] Review user access levels

### Quarterly
- [ ] Conduct penetration testing
- [ ] Review and update security policies
- [ ] Security training for team
- [ ] Review data retention compliance
- [ ] Update incident response plan

### Annually
- [ ] Full security audit
- [ ] Review compliance requirements
- [ ] Update privacy policy and terms
- [ ] Disaster recovery drill

---

## Priority Order for Implementation

If you have limited time, implement in this order:

1. **Week 1:** Security headers + Rate limiting (P0)
2. **Week 2:** Error sanitization + CSRF protection (P0)
3. **Week 3:** Authorization fixes + Input validation (P1)
4. **Week 4:** XSS prevention + Audit logging (P1)
5. **Week 5-6:** Database constraints + Production logging (P2)
6. **Week 7-8:** Session management + Data retention (P2)
7. **Month 3+:** Documentation + Dependencies (P3)

---

## Quick Reference: Files to Create/Modify

### New Files to Create
- `lib/rate-limiter.ts`
- `lib/error-handler.ts`
- `lib/csrf.ts`
- `lib/csrf-context.tsx`
- `lib/schemas/validation.ts`
- `lib/sanitize.ts`
- `lib/audit-logger.ts`
- `lib/logger.ts`
- `middleware.ts` (root directory)
- `app/api/csrf-token/route.ts`
- `supabase/migrations/004_rate_limiting.sql`
- `supabase/migrations/005_audit_logging.sql`
- `supabase/migrations/006_additional_constraints.sql`

### Files to Modify
- `next.config.ts` (add security headers)
- `app/layout.tsx` (add CsrfProvider)
- `app/api/evaluations/route.ts` (fix authorization)
- `app/api/chat/[sessionId]/messages/route.ts` (add validation)
- `components/chat-interface.tsx` (add sanitization)
- `components/transcript-viewer.tsx` (add sanitization)
- All API routes (add error handling, audit logging)

---

## Support & Resources

- **Main Report:** `SECURITY_ANALYSIS_REPORT.md`
- **Implementation Guide:** `SECURITY_FIXES_IMPLEMENTATION_GUIDE.md`
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Next.js Security:** https://nextjs.org/docs/app/building-your-application/configuring/security-headers
- **Supabase Security:** https://supabase.com/docs/guides/auth/row-level-security

---

## Sign-Off

When all CRITICAL (P0) items are complete:

- [ ] Reviewed by: _____________________ Date: __________
- [ ] Tested by: ______________________ Date: __________
- [ ] Approved for production: __________ Date: __________

**Remember:** Security is an ongoing process, not a one-time fix!

