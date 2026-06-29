import re

with open('src/pages/admin/AprobacionCreditos.tsx', 'r') as f:
    content = f.read()

with open('new_modal.tsx', 'r') as f:
    new_modal = f.read()

# Trim the trailing `      {/* Modal: Nueva Solicitud Presencial */}` from new_modal if it exists
new_modal = new_modal.split('{/* Modal: Nueva Solicitud Presencial */}')[0].strip()
# new_modal now contains just the verPagareCredito modal code.

# Find the start and end of the verPagareCredito modal in AprobacionCreditos.tsx
start_marker = '{/* Modal: Visor de Pagaré Firmado Custodiado */}'
end_marker = '{/* Modal: Nueva Solicitud Presencial */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + start_marker + '\n      ' + new_modal + '\n\n      ' + content[end_idx:]
    with open('src/pages/admin/AprobacionCreditos.tsx', 'w') as f:
        f.write(new_content)
    print("Modal injected successfully!")
else:
    print("Error finding markers")

