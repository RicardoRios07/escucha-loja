// Validación local ecuatoriana de cédula (10 dígitos, módulo 10)
// Para MVP sin API externa
export function validarCedulaEcuador(cedula: string): { valid: boolean; error?: string } {
  const c = (cedula || "").trim()
  if (!/^\d{10}$/.test(c)) return { valid: false, error: "La cédula debe tener 10 dígitos numéricos" }
  const provincia = parseInt(c.substring(0, 2), 10)
  if (provincia < 1 || provincia > 24) return { valid: false, error: "Código de provincia inválido (01-24)" }
  const tercerDigito = parseInt(c.charAt(2), 10)
  if (tercerDigito >= 6) return { valid: false, error: "Tercer dígito debe ser menor a 6 para cédula natural" }

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let v = parseInt(c.charAt(i), 10) * coef[i]
    if (v >= 10) v -= 9
    suma += v
  }
  const verificador = (10 - (suma % 10)) % 10
  const ultimo = parseInt(c.charAt(9), 10)
  if (verificador !== ultimo) return { valid: false, error: "Dígito verificador no coincide" }
  return { valid: true }
}

export function formatearCedula(v: string) {
  return v.replace(/\D/g, "").slice(0, 10)
}
