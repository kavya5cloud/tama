const APPROVAL_REQUIRED = new Set([
  "send_email",
  "send_message",
  "upload_file",
  "submit_form",
  "share_company_information",
  "add_recipient",
  "change_external_record"
]);

const BLOCKED = new Set([
  "purchase",
  "payment",
  "bank_transfer",
  "contract_acceptance",
  "password_change",
  "security_setting_change",
  "captcha_bypass",
  "mass_outreach"
]);

export function evaluateAction(action) {
  const type = action?.type;

  if (BLOCKED.has(type)) {
    return {
      decision: "blocked",
      reason: `Action "${type}" is prohibited.`
    };
  }

  if (APPROVAL_REQUIRED.has(type)) {
    return {
      decision: "approval_required",
      reason: `Action "${type}" requires explicit user approval.`
    };
  }

  return {
    decision: "allowed",
    reason: "Action is allowed within the current task."
  };
}
