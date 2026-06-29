import re

with open('src/pages/admin/AprobacionCreditos.tsx', 'r') as f:
    content = f.read()

with open('new_modal.tsx', 'r') as f:
    new_modal = f.read()

# 1. Inject activeModalTab state around line 245
state_injection = "  const [activeModalTab, setActiveModalTab] = useState<'pagare' | 'amortizacion'>('pagare');\n  const [verPagareCredito, setVerPagareCredito] = useState<Credito | null>(null);"

content = re.sub(
    r'const \[creditoSeleccionado, setCreditoSeleccionado\] = useState<Credito \| null>\(null\);',
    r'const [creditoSeleccionado, setCreditoSeleccionado] = useState<Credito | null>(null);\n' + state_injection,
    content
)

# 2. Modify handleSelectCardClick
# Replace setCreditoSeleccionado(credito) with setVerPagareCredito(credito); setActiveModalTab('pagare');
# Wait, let's find handleSelectCardClick precisely.
old_click = """  const handleSelectCardClick = async (credito: Credito) => {
    setCreditoSeleccionado(credito);
    setDisburseError(null);"""

new_click = """  const handleSelectCardClick = async (credito: Credito) => {
    setVerPagareCredito(credito);
    setActiveModalTab('pagare');
    setDisburseError(null);"""

content = content.replace(old_click, new_click)

# 3. Inject new_modal.tsx just before the end of AprobacionCreditos component
# Let's find: {/* Modal: Nueva Solicitud Presencial */}
nueva_solicitud_idx = content.find('{/* Modal: Nueva Solicitud Presencial */}')
if nueva_solicitud_idx != -1:
    content = content[:nueva_solicitud_idx] + new_modal + '\n      ' + content[nueva_solicitud_idx:]
else:
    # If not found, inject before `</>`
    fragment_end_idx = content.rfind('</>')
    if fragment_end_idx != -1:
        content = content[:fragment_end_idx] + new_modal + '\n      ' + content[fragment_end_idx:]

with open('src/pages/admin/AprobacionCreditos.tsx', 'w') as f:
    f.write(content)

print("Revert complete")
