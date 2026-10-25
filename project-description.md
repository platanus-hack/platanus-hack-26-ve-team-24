# Constancia

**Tu historial profesional, verificable. Y solo se muestra lo que tú elijas.**

`team-24` · Platanus Hack 26 Caracas · [Demo en vivo](https://platanus-hack-26-ve-team-24-rhg9.onrender.com)

---

## El problema

Un CV es una lista que nadie puede comprobar. Quien contrata, un banco o un consulado no puede llamar a cada empleador para saber si esos puestos existieron, así que acepta un PDF que cualquiera escribe a mano. Y quien lo presenta entrega **toda** su historia aunque solo le pidan un dato.

## La propuesta

Constancia convierte el historial laboral en un **CV verificable**: cada puesto es una constancia firmada por un empleador acreditado, el trabajador las une en un historial, y quien lee el CV comprueba la trayectoria entera en su propio navegador, sin llamar a nadie. El trabajador decide, dato por dato, qué parte de esa historia se revela.

## Cómo funciona

| Rol | Qué hace |
| :-- | :-- |
| **Empleador** | RR. HH. crea una cuenta de organización con una clave del dispositivo, sin wallet y sin comisiones, y solicita acreditación al consorcio. Cuando un quórum de miembros la aprueba, llena un formulario y descarga la constancia como **PDF**: una capa visual legible y, adentro, el token firmado. La solicitud de la constancia ocurre fuera de la plataforma. |
| **Trabajador** | Con ese PDF elige, dato por dato, qué muestra y genera una presentación en PDF que no contiene los demás datos. Con varias constancias de la misma persona arma un historial único, sellado, con su línea de tiempo, sus huecos y sus solapamientos. |
| **Verificador** | Carga el PDF (constancia, presentación o historial). Cinco chequeos corren en su navegador y solo aparecen los datos elegidos, con el número exacto de los que siguen ocultos. |

### Los cinco chequeos

1. El certificado está bien formado.
2. El empleador está acreditado por el consorcio.
3. La firma del emisor es válida.
4. El certificado está vinculado a su titular.
5. Existe el registro en el ledger y no está revocado.

Se repiten por cada entrada del CV y corren en el navegador de quien verifica: el certificado nunca sale de ahí. El chequeo del ledger consulta la cadena por un hash, a través de una única pasarela de lectura.

## El CV verificado

Cada constancia entra al CV con su propia clave. Al sellarlo, cada clave firma el hash del conjunto: nadie puede agregar un empleo ajeno ni quitar uno después de sellar. El resultado es un archivo con la trayectoria completa, verificable entrada por entrada, y un **Laboratorio de cartas falsas** donde se prueban cuatro falsificaciones y se ve en cuál chequeo falla cada una.

## Confianza y no repudio

El diseño ataca dos propiedades concretas, no una estética.

**Confianza sin intermediario.** Nadie tiene que creerle a un PDF ni llamar al empleador. La raíz no es una empresa sino el consorcio: un empleador solo puede emitir si un quórum de miembros lo acreditó, y esa acreditación la comprueba el propio verificador, en su navegador, contra el contrato. Si el empleador se suspende, la misma constancia deja de pasar.

**No repudio.** El emisor firma cada constancia con una clave ES256 de su dispositivo, y el ledger ancla el hash del certificado junto a la cuenta del emisor y al `keyId` que firmó. Después no puede negar que la emitió, ni afirmar que emitió otra cosa: el hash está publicado, la firma lo cubre y la revocación también queda registrada. Del lado del trabajador, cada constancia está atada a su clave y el CV se sella con la clave de cada entrada, así que tampoco puede agregar un empleo ajeno ni borrar uno después de sellarlo.

## El ledger del consorcio

La raíz de confianza no es una empresa: es la acreditación por un consorcio de miembros (en la demo, ficticios), registrada en un contrato sobre la testnet pública Sepolia. Cuatro miembros votan y un quórum de dos acredita a un empleador. El estado es público en `/ledger` y guarda solo el hash, la cuenta del emisor, la clave que firmó y la hora: ningún nombre, ningún dato, ningún certificado.

## Por qué Sepolia y no la red de consorcio

La solución tenía que estar desplegada y abierta desde cualquier navegador, y no teníamos un VPS: solo Render, que no puede alojar la red de consorcio simulada con sus validadores y su consenso. Así que la capa de acuerdo corre en **Sepolia**, la testnet pública de Ethereum, y se simula la propiedad que de verdad importa: **que nadie pague**.

En una red de consorcio los validadores son los propios miembros y el gas se lo pagan entre ellos, así que para el usuario es gratis. En Sepolia el gas existe, y lo absorbe una sola wallet patrocinadora a través de un paymaster: ninguna operación le cuesta nada a nadie y no hay ninguna comisión que mostrar. El resto del modelo es el mismo en las dos redes: el contrato, los cuatro miembros, el quórum y la acreditación no cambian; solo cambia quién produce los bloques.

## Qué es real

- **Credenciales SD-JWT** con divulgación selectiva (W3C VC 2.0), no pruebas de conocimiento cero. La verificación ocurre en el navegador.
- **Servidor ciego.** Solo ve texto cifrado, claves públicas, hashes y un número de empleado opaco.
- **Ledger en Sepolia.** Una sola wallet patrocinadora paga el gas de todas las operaciones a través de un paymaster; ningún usuario ve una comisión.
- **Ficción declarada.** Todos los empleadores, miembros y personas de la demo son inventados.

## Lo que no prometemos

- Verificar un CV que ya exista en PDF. Lo que se verifica es la trayectoria compuesta por constancias de empleadores acreditados.
- Que el ledger pruebe que la constancia es cierta. Prueba quién lo dijo y cuándo: un empleador acreditado puede mentir, y la suspensión es la consecuencia.
- No repudio contra una clave robada. Si la clave del dispositivo se filtra, la constancia sigue siendo del emisor; la respuesta es revocar y suspender, no reescribir la historia.
- Un enlace que no se pueda reutilizar. Un enlace compartido se puede reabrir hasta que expire.
- Una lectura independiente del ledger. El navegador consulta la cadena a través de una sola pasarela nuestra.
- Recuperación si se pierde el dispositivo. Se pide de nuevo la constancia.

## Tecnología

| Capa | Tecnología |
| :-- | :-- |
| Producto | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Credencial | SD-JWT VC (W3C VC 2.0), claves ES256 de WebCrypto |
| Cadena | Ethereum Sepolia, Solidity y Foundry, cuentas ERC-4337 con claves P-256, viem |
| Servidor | PostgreSQL con Prisma, solo buzón cifrado |

## Equipo

team-24 · Platanus Hack 26 Caracas.

<img src="./team.webp" alt="El equipo de Constancia en Platanus Hack 26 Caracas" width="760" />
