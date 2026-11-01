# Guía: pago de prueba con USDC real (Arc Mainnet)

Para el grant de Arc Microgrants 2. Cierre: lunes 2/11/2026 01:59 ART.
Firmás vos en Rabby. Nadie más firma ni mueve fondos por vos.

**App:** https://autentika-app.vercel.app  
**Contrato:** `0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4`  
**Explorer:** https://explorer.arc.io/address/0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4

Usá **1 USDC** (o menos si preferís). Para la demo, artista y coleccionista pueden ser la misma billetera.

## Antes
1. Abrí Rabby y asegurate de estar en **Arc Mainnet** (chain ID 5042).
2. Tené un poco de USDC en esa billetera (para el pago y para el gas; en Arc el gas se paga en USDC).
3. Abrí https://autentika-app.vercel.app
4. Arriba a la derecha: conectá la billetera.
5. Si el selector de red no dice Arc Mainnet, cambialo a **Arc Mainnet**.
6. Si querés la app en español, tocá el toggle **ES**.

## 1. Crear el encargo (como artista)
1. Tocá la pestaña **Como Artista**.
2. Tocá **Crear Encargo**.
3. Completá:
   - **Título del Encargo** (ej. `Prueba grant Arc`)
   - **Monto (USDC)** → `1`
   - **Fecha Límite** → una fecha de acá a unos días
   - **Dirección del Coleccionista** → tu misma dirección (copiala de Rabby)
4. Dejá hitos y regalía vacíos (así el flujo es el más simple).
5. Tocá **Crear Encargo**.
6. En Rabby: revisá y **confirmá** la transacción.
7. Esperá el toast **¡Encargo creado!** Anotá el número del encargo.

## 2. Financiar (como coleccionista)
1. Tocá la pestaña **Como Coleccionista**.
2. Abrí el encargo que acabás de crear.
3. Primero tocá **Aprobar USDC**. Confirmá en Rabby. Esperá **¡USDC aprobado!**
4. Después tocá **Financiar Encargo**. Confirmá en Rabby.
5. El estado tiene que pasar a **Financiado**.

## 3. Entregar con certificado (como artista)
1. Volvé a **Como Artista** y abrí el mismo encargo.
2. Completá el formulario de entrega (título de la obra, técnica, dimensiones, fecha, foto).
   - Podés usar **Subir Foto**: el hash SHA-256 se calcula solo.
3. Tocá **Enviar Entrega y Certificado**.
4. Confirmá en Rabby.
5. Esperá **¡Entrega enviada con Certificado de Autenticidad!**
6. El estado pasa a **Entregado**.

## 4. Confirmar recepción (como coleccionista)
1. Tocá **Como Coleccionista** y abrí el encargo.
2. Tocá **Confirmar Recepción**.
3. Confirmá en Rabby.
4. Esperá **¡Transacción confirmada!**

## 5. Retirar el USDC (como artista)
1. Arriba en la app debería aparecer el aviso: **Tienes USDC pendiente de retirar**.
2. Tocá **Retirar**.
3. Confirmá en Rabby.
4. Listo: el USDC (menos la comisión de 0,5 %) vuelve a tu billetera.

## Qué guardar para DoraHacks
Anotá y guardá estos links del explorer (cada uno sale en Rabby o en el toast de la app):

- Tx de **Crear Encargo**
- Tx de **Aprobar USDC**
- Tx de **Financiar Encargo**
- Tx de **Enviar Entrega y Certificado**
- Tx de **Confirmar Recepción**
- Tx de **Retirar**

Con una sola de pago real (ideal: la de **Financiar Encargo** o la de **Confirmar Recepción**) ya cubrís el criterio de USDC real del grant. Pegá el hash en el borrador: `/workspace/autentika_dorahacks_borrador.md`.

## Si algo falla
- Si dice que AutentikaV2 no está desplegado: fijate de estar en **Arc Mainnet**, no en Testnet.
- Si **Financiar Encargo** falla: primero tenés que haber hecho **Aprobar USDC**.
- Si no aparece **Retirar**: confirmá de nuevo la recepción y recargá la página.
