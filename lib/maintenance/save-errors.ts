/** Turning a database rejection into something a tech can act on.
 *
 *  The HVAC PM form showed this, verbatim, on a phone in a mechanical room:
 *
 *    new row for relation "pm_reports" violates check constraint
 *    "pm_reports_pm_season_check"
 *
 *  Every word of that is true and none of it is useful. It does not name the
 *  field, does not say what to do, and reads like the app is broken rather than
 *  like one box needs re-picking. The constraint name is the one part that
 *  identifies the field, so it is worth translating rather than hiding.
 *
 *  The raw text is still shown underneath, because when something unmapped goes
 *  wrong a support message quoting the real error is worth more than a tidy
 *  sentence that says nothing.
 */

export interface SaveError {
  /** What the tech reads first: the field, and what to do about it. */
  message: string
  /** The database's own words, kept for anything not mapped here. */
  detail?: string
}

/** Constraint name → the field it guards, in the form's own language. */
const CHECK_CONSTRAINTS: Record<string, string> = {
  pm_reports_pm_season_check:
    'Season needs to be Spring, Summer, Fall or Winter. Please re-pick it and save again.',
  pm_reports_report_type_check:
    'This report has an unexpected type. Reopen it from the Maintenance page and try again.',
}

/** Column name → how the form labels it. */
const COLUMN_LABELS: Record<string, string> = {
  store_name: 'Store / Site Name',
  pm_season: 'Season',
  performed_at: 'Date',
  report_type: 'Report type',
  technician: 'Technician',
}

const label = (column: string) => COLUMN_LABELS[column] ?? column.replace(/_/g, ' ')

/** Build the message shown above a failed save. */
export function describeSaveError(raw: unknown, status?: number): SaveError {
  const text = typeof raw === 'string' ? raw.trim() : ''

  if (!text) {
    if (status === 401 || status === 403) {
      return { message: 'Your session has expired. Sign in again — this form is kept on this device, so nothing is lost.' }
    }
    if (status && status >= 500) {
      return { message: 'The server could not save this report. Your work is kept on this device, so you can try again.' }
    }
    return { message: 'Could not save this report. Your work is kept on this device, so you can try again.' }
  }

  // A named CHECK constraint identifies the exact field.
  const check = text.match(/violates check constraint "([^"]+)"/)
  if (check) {
    const known = CHECK_CONSTRAINTS[check[1]]
    return {
      message: known ?? `One of the values in this form is not one the system accepts (${check[1]}). Re-pick the fields you changed and save again.`,
      detail: text,
    }
  }

  const notNull = text.match(/null value in column "([^"]+)"/)
  if (notNull) {
    return { message: `${label(notNull[1])} is required. Fill it in and save again.`, detail: text }
  }

  const unique = text.match(/violates unique constraint "([^"]+)"/)
  if (unique) {
    return { message: 'A report like this already exists. Open it from the Maintenance page rather than creating a second one.', detail: text }
  }

  const foreignKey = text.match(/violates foreign key constraint "([^"]+)"/)
  if (foreignKey) {
    return { message: 'This report points at a store or piece of equipment that no longer exists. Re-pick it and save again.', detail: text }
  }

  const tooLong = text.match(/value too long for type character varying\((\d+)\)/)
  if (tooLong) {
    return { message: `One of the text fields is longer than the ${tooLong[1]} characters allowed. Shorten it and save again.`, detail: text }
  }

  // Unmapped: the raw text is all we have, so lead with it rather than hide it.
  return { message: text }
}
