// What every group of `xgen check` returns: a name, what it holds, and the list of problems (empty when it passes).
export interface CheckResult { name: string; what: string; problems: string[] }
export const result = (name: string, what: string, problems: string[]): CheckResult => ({ name, what, problems });
