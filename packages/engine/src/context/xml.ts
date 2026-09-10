export function escapeXml(value: string): string {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
}

export function xmlAttr(value: string | number | boolean): string { return escapeXml(String(value)); }
