export type Locale = 'en' | 'pt' | 'es'

export type MessageKey =
  | 'app.tagline'
  | 'nav.section'
  | 'nav.dashboard'
  | 'nav.materials'
  | 'nav.recipes'
  | 'nav.inventory'
  | 'nav.orders'
  | 'nav.deferred'
  | 'nav.suppliers'
  | 'nav.customers'
  | 'nav.purchases'
  | 'nav.reports'
  | 'prefs.theme'
  | 'prefs.theme.light'
  | 'prefs.theme.dark'
  | 'prefs.theme.system'
  | 'prefs.language'
  | 'prefs.account'
  | 'prefs.owner'
  | 'prefs.close'
  | 'banner.currency'
  | 'banner.live'
  | 'banner.mock'
  | 'common.loading'
  | 'common.error'
  | 'common.refresh'
  | 'common.submitApproval'
  | 'common.approve'
  | 'common.reject'
  | 'common.done'
  | 'common.edit'
  | 'common.actions'
  | 'common.cancel'
  | 'uom.kg'
  | 'uom.g'
  | 'uom.L'
  | 'uom.ml'
  | 'uom.unit'
  | 'uom.pack'
  | 'demo.flour'
  | 'demo.bread'
  | 'cost.method.list_price'
  | 'cost.method.weighted_avg'
  | 'cost.method.last_purchase'
  | 'cost.zeroLabel'
  | 'pager.label'
  | 'pager.perPage'
  | 'pager.range'
  | 'pager.empty'
  | 'pager.prev'
  | 'pager.next'
  | 'pager.page'
  | 'future.work'
  | 'dashboard.title'
  | 'dashboard.lead'
  | 'dashboard.period'
  | 'dashboard.revenue'
  | 'dashboard.cogs'
  | 'dashboard.profit'
  | 'dashboard.margin'
  | 'dashboard.lowStock'
  | 'dashboard.pipeline'
  | 'dashboard.pending'
  | 'dashboard.inProgress'
  | 'dashboard.completed'
  | 'dashboard.topProducts'
  | 'dashboard.empty'
  | 'dashboard.alerts'
  | 'material.title'
  | 'material.lead'
  | 'material.name'
  | 'material.id'
  | 'material.uom'
  | 'material.listPrice'
  | 'material.lastPurchase'
  | 'material.reorder'
  | 'material.empty'
  | 'material.createTitle'
  | 'material.editTitle'
  | 'material.add'
  | 'material.create'
  | 'material.saving'
  | 'material.catalog'
  | 'material.namePlaceholder'
  | 'material.lookupTitle'
  | 'material.lookupLead'
  | 'material.searchTerms'
  | 'material.search'
  | 'material.searching'
  | 'material.suggestions'
  | 'material.brand'
  | 'material.qtyLabel'
  | 'material.barcode'
  | 'recipe.title'
  | 'recipe.lead'
  | 'recipe.empty'
  | 'recipe.zeroCost'
  | 'recipe.yield'
  | 'recipe.targetMargin'
  | 'recipe.fgSku'
  | 'recipe.costStack'
  | 'recipe.costMethod'
  | 'recipe.totalMaterial'
  | 'recipe.unitCost'
  | 'recipe.recommended'
  | 'recipe.createTitle'
  | 'recipe.editTitle'
  | 'recipe.add'
  | 'recipe.create'
  | 'recipe.saving'
  | 'recipe.catalog'
  | 'recipe.namePlaceholder'
  | 'recipe.lines'
  | 'recipe.material'
  | 'recipe.lineQty'
  | 'recipe.addLine'
  | 'recipe.removeLine'
  | 'recipe.selectMaterial'
  | 'recipe.qtyPositive'
  | 'recipe.needMaterials'
  | 'recipe.stockAlertTitle'
  | 'recipe.stockAlertBody'
  | 'recipe.stockAlertHint'
  | 'recipe.stockMissing'
  | 'inventory.title'
  | 'inventory.lead'
  | 'inventory.onHand'
  | 'inventory.type'
  | 'inventory.type.RM'
  | 'inventory.type.FG'
  | 'inventory.sku'
  | 'inventory.reorderCol'
  | 'inventory.unitCost'
  | 'inventory.proposeAdjust'
  | 'inventory.delta'
  | 'inventory.reason'
  | 'inventory.empty'
  | 'inventory.adjust'
  | 'orders.title'
  | 'orders.lead'
  | 'orders.empty'
  | 'orders.qty'
  | 'orders.sellPrice'
  | 'orders.status'
  | 'orders.status.pending'
  | 'orders.status.in_progress'
  | 'orders.status.completed'
  | 'orders.actions'
  | 'orders.proposeCreate'
  | 'orders.proposeProduce'
  | 'orders.proposeShip'
  | 'orders.quantityFg'
  | 'orders.createTitle'
  | 'orders.product'
  | 'orders.selectProduct'
  | 'orders.needProduct'
  | 'orders.uom'
  | 'orders.payment'
  | 'orders.payment.cash'
  | 'orders.payment.card'
  | 'orders.payment.pix'
  | 'orders.payment.bank_transfer'
  | 'orders.payment.other'
  | 'orders.notes'
  | 'orders.notesPlaceholder'
  | 'orders.priceHint'
  | 'orders.suggestedPrice'
  | 'hitl.title'
  | 'hitl.lead'
  | 'hitl.none'
  | 'hitl.feedback'
  | 'hitl.feedbackPlaceholder'
  | 'hitl.rejectNeedsFeedback'
  | 'copilot.title'
  | 'copilot.lead'
  | 'copilot.message'
  | 'copilot.ask'
  | 'copilot.asking'
  | 'copilot.agent'
  | 'copilot.grounding'
  | 'copilot.artifacts'
  | 'copilot.crewPlan'
  | 'copilot.agentReasoning'

const en: Record<MessageKey, string> = {
  'app.tagline': 'Costing for makers of any craft',
  'nav.section': 'Workspace',
  'nav.dashboard': 'Dashboard',
  'nav.materials': 'Materials',
  'nav.recipes': 'Recipes',
  'nav.inventory': 'Inventory',
  'nav.orders': 'Orders',
  'nav.deferred': 'Deferred',
  'nav.suppliers': 'Suppliers',
  'nav.customers': 'Customers',
  'nav.purchases': 'Purchases',
  'nav.reports': 'Reports',
  'prefs.theme': 'Theme',
  'prefs.theme.light': 'Light',
  'prefs.theme.dark': 'Dark',
  'prefs.theme.system': 'System',
  'prefs.language': 'Language',
  'prefs.account': 'Account menu',
  'prefs.owner': 'Owner',
  'prefs.close': 'Close',
  'banner.currency': 'Currency',
  'banner.live': 'live API',
  'banner.mock': 'demo data (set VITE_API_BASE_URL for the live API)',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong',
  'common.refresh': 'Refresh',
  'common.submitApproval': 'Submit for approval',
  'common.approve': 'Approve',
  'common.reject': 'Reject',
  'common.done': 'Done',
  'common.edit': 'Edit',
  'common.actions': 'Actions',
  'common.cancel': 'Cancel',
  'uom.kg': 'kg',
  'uom.g': 'g',
  'uom.L': 'L',
  'uom.ml': 'ml',
  'uom.unit': 'unit',
  'uom.pack': 'pack',
  'demo.flour': 'Flour',
  'demo.bread': 'Simple Bread',
  'cost.method.list_price': 'List price',
  'cost.method.weighted_avg': 'Weighted average',
  'cost.method.last_purchase': 'Last purchase',
  'cost.zeroLabel': 'n/a / zero cost',
  'pager.label': 'Pagination',
  'pager.perPage': 'Rows',
  'pager.range': '{start}–{end} of {total}',
  'pager.empty': 'No rows',
  'pager.prev': 'Previous',
  'pager.next': 'Next',
  'pager.page': 'Page {page} / {pages}',
  'future.work': 'Future work',
  'dashboard.title': 'Dashboard',
  'dashboard.lead':
    'All-time view of revenue, costs, margins, low stock, and order pipeline.',
  'dashboard.period': 'Period: all-time',
  'dashboard.revenue': 'Revenue',
  'dashboard.cogs': 'COGS',
  'dashboard.profit': 'Profit',
  'dashboard.margin': 'Margin',
  'dashboard.lowStock': 'Low stock',
  'dashboard.pipeline': 'Order pipeline',
  'dashboard.pending': 'Pending',
  'dashboard.inProgress': 'In progress',
  'dashboard.completed': 'Completed',
  'dashboard.topProducts': 'Products by profit',
  'dashboard.empty': 'No completed sales yet. Create and ship an order to see totals.',
  'dashboard.alerts': 'Low-stock alerts',
  'material.title': 'Materials',
  'material.lead':
    'Register any input — flour, chocolate, soap base, fabric, packaging — with its unit of measure. Sample seed data is illustrative only.',
  'material.name': 'Name',
  'material.id': 'ID',
  'material.uom': 'Unit of measure',
  'material.listPrice': 'List price',
  'material.lastPurchase': 'Last purchase price',
  'material.reorder': 'Reorder point',
  'material.empty': 'No material registered yet. Create one above.',
  'material.createTitle': 'Register material',
  'material.editTitle': 'Edit material',
  'material.add': 'Add material',
  'material.create': 'Save material',
  'material.saving': 'Saving…',
  'material.catalog': 'Your materials',
  'material.namePlaceholder': 'e.g. Cocoa butter, Cotton yarn, Sugar…',
  'material.lookupTitle': 'External product lookup',
  'material.lookupLead':
    'Optional Open Food Facts search. Suggestions stay advisory.',
  'material.searchTerms': 'Search terms',
  'material.search': 'Search Open Food Facts',
  'material.searching': 'Searching…',
  'material.suggestions': 'Suggestions',
  'material.brand': 'Brand',
  'material.qtyLabel': 'Qty label',
  'material.barcode': 'Barcode',
  'recipe.title': 'Recipes',
  'recipe.lead':
    'Build a formula from your materials — bakery, confectionery, crafts, cosmetics, or any small-batch product.',
  'recipe.empty': 'No recipe registered yet. Create one above.',
  'recipe.zeroCost': 'Show zero-cost case (DEC-16)',
  'recipe.yield': 'Yield',
  'recipe.targetMargin': 'Target margin',
  'recipe.fgSku': 'Finished SKU',
  'recipe.costStack': 'Cost stack / engine figures',
  'recipe.costMethod': 'Cost method',
  'recipe.totalMaterial': 'Total material cost',
  'recipe.unitCost': 'Unit cost',
  'recipe.recommended': 'Recommended sell price',
  'recipe.createTitle': 'Create recipe',
  'recipe.editTitle': 'Edit recipe',
  'recipe.add': 'Add recipe',
  'recipe.create': 'Save recipe',
  'recipe.saving': 'Saving…',
  'recipe.catalog': 'Your recipes',
  'recipe.namePlaceholder': 'e.g. Chocolate truffle, Candle blend…',
  'recipe.lines': 'Ingredients from your materials',
  'recipe.material': 'Material',
  'recipe.lineQty': 'Quantity',
  'recipe.addLine': 'Add material line',
  'recipe.removeLine': 'Remove',
  'recipe.selectMaterial': 'Select a material…',
  'recipe.qtyPositive': 'Each line quantity must be greater than zero.',
  'recipe.needMaterials':
    'Register at least one material before creating a recipe.',
  'recipe.stockAlertTitle': 'Stock alert',
  'recipe.stockAlertBody':
    '“{name}” is not available in stock (on hand: {qty}). You can still add it to the recipe; replenish inventory before production.',
  'recipe.stockAlertHint':
    'This warning is advisory — recipe save is not blocked.',
  'recipe.stockMissing': 'no stock row',
  'inventory.title': 'Inventory',
  'inventory.lead':
    'On-hand balances. Stock changes require a HITL proposal and human approval.',
  'inventory.onHand': 'On hand',
  'inventory.type': 'Type',
  'inventory.type.RM': 'Raw material',
  'inventory.type.FG': 'Finished good',
  'inventory.sku': 'SKU',
  'inventory.reorderCol': 'Reorder',
  'inventory.unitCost': 'Unit cost',
  'inventory.proposeAdjust': 'Propose manual adjustment',
  'inventory.delta': 'Delta',
  'inventory.reason': 'Reason',
  'inventory.empty': 'No inventory rows yet.',
  'inventory.adjust': 'Adjust',
  'orders.title': 'Orders',
  'orders.lead':
    'Three-state flow: pending → in progress → completed. Each step needs HITL approval.',
  'orders.empty': 'No orders yet. Create one with the button above.',
  'orders.qty': 'Qty',
  'orders.sellPrice': 'Sell price',
  'orders.status': 'Status',
  'orders.status.pending': 'Pending',
  'orders.status.in_progress': 'In progress',
  'orders.status.completed': 'Completed',
  'orders.actions': 'Actions',
  'orders.proposeCreate': 'New order',
  'orders.proposeProduce': 'Propose produce',
  'orders.proposeShip': 'Propose ship',
  'orders.quantityFg': 'Quantity (FG units)',
  'orders.createTitle': 'Create order',
  'orders.product': 'Product',
  'orders.selectProduct': 'Select a product…',
  'orders.needProduct':
    'Create a recipe with a finished SKU before placing an order.',
  'orders.uom': 'Units',
  'orders.payment': 'Payment',
  'orders.payment.cash': 'Cash',
  'orders.payment.card': 'Card',
  'orders.payment.pix': 'PIX',
  'orders.payment.bank_transfer': 'Bank transfer',
  'orders.payment.other': 'Other',
  'orders.notes': 'Notes',
  'orders.notesPlaceholder': 'Optional customer or delivery note',
  'orders.priceHint': 'Recommended if empty',
  'orders.suggestedPrice': 'Suggested sell price',
  'hitl.title': 'Human-in-the-loop',
  'hitl.lead':
    'Pending write proposals wait here. Approve executes the mutation; reject keeps data unchanged.',
  'hitl.none': 'No pending approvals.',
  'hitl.feedback': 'Feedback (required to reject)',
  'hitl.feedbackPlaceholder': 'Optional note on approve; required on reject',
  'hitl.rejectNeedsFeedback': 'Reject requires feedback explaining why.',
  'copilot.title': 'Costing copilot',
  'copilot.lead':
    'Non-streaming chat (CrewAI). Explains engine figures — the agent does not invent numbers.',
  'copilot.message': 'Message',
  'copilot.ask': 'Ask costing analyst',
  'copilot.asking': 'Asking…',
  'copilot.agent': 'Agent',
  'copilot.grounding': 'Grounding',
  'copilot.artifacts': 'Planning & reasoning',
  'copilot.crewPlan': 'Crew plan',
  'copilot.agentReasoning': 'Agent reasoning',
}

const pt: Record<MessageKey, string> = {
  ...en,
  'app.tagline': 'Custeio para makers de qualquer ofício',
  'nav.section': 'Espaço de trabalho',
  'nav.dashboard': 'Painel',
  'nav.materials': 'Materiais',
  'nav.recipes': 'Receitas',
  'nav.inventory': 'Estoque',
  'nav.orders': 'Pedidos',
  'nav.deferred': 'Adiado',
  'nav.suppliers': 'Fornecedores',
  'nav.customers': 'Clientes',
  'nav.purchases': 'Compras',
  'nav.reports': 'Relatórios',
  'prefs.theme': 'Tema',
  'prefs.theme.light': 'Claro',
  'prefs.theme.dark': 'Escuro',
  'prefs.theme.system': 'Sistema',
  'prefs.language': 'Idioma',
  'prefs.account': 'Menu da conta',
  'prefs.owner': 'Proprietário',
  'prefs.close': 'Fechar',
  'banner.currency': 'Moeda',
  'banner.live': 'API ao vivo',
  'banner.mock': 'dados de demonstração (defina VITE_API_BASE_URL para a API ao vivo)',
  'common.loading': 'Carregando…',
  'common.error': 'Algo deu errado',
  'common.refresh': 'Atualizar',
  'common.submitApproval': 'Enviar para aprovação',
  'common.approve': 'Aprovar',
  'common.reject': 'Rejeitar',
  'common.done': 'Concluído',
  'common.edit': 'Editar',
  'common.actions': 'Ações',
  'common.cancel': 'Cancelar',
  'uom.kg': 'kg',
  'uom.g': 'g',
  'uom.L': 'L',
  'uom.ml': 'ml',
  'uom.unit': 'unidade',
  'uom.pack': 'pacote',
  'demo.flour': 'Farinha',
  'demo.bread': 'Pão simples',
  'cost.method.list_price': 'Preço de lista',
  'cost.method.weighted_avg': 'Média ponderada',
  'cost.method.last_purchase': 'Última compra',
  'cost.zeroLabel': 'n/d / custo zero',
  'pager.label': 'Paginação',
  'pager.perPage': 'Linhas',
  'pager.range': '{start}–{end} de {total}',
  'pager.empty': 'Sem linhas',
  'pager.prev': 'Anterior',
  'pager.next': 'Próxima',
  'pager.page': 'Página {page} / {pages}',
  'future.work': 'Trabalho futuro',
  'dashboard.title': 'Painel',
  'dashboard.lead':
    'Visão acumulada de receita, custos, margens, estoque baixo e pipeline de pedidos.',
  'dashboard.period': 'Período: todo o histórico',
  'dashboard.revenue': 'Receita',
  'dashboard.cogs': 'CMV',
  'dashboard.profit': 'Lucro',
  'dashboard.margin': 'Margem',
  'dashboard.lowStock': 'Estoque baixo',
  'dashboard.pipeline': 'Pipeline de pedidos',
  'dashboard.pending': 'Pendente',
  'dashboard.inProgress': 'Em andamento',
  'dashboard.completed': 'Concluído',
  'dashboard.topProducts': 'Produtos por lucro',
  'dashboard.empty':
    'Ainda não há vendas concluídas. Crie e envie um pedido para ver totais.',
  'dashboard.alerts': 'Alertas de estoque baixo',
  'material.title': 'Materiais',
  'material.lead':
    'Cadastre qualquer insumo — farinha, chocolate, base de sabão, tecido, embalagem — com sua unidade. Os dados de exemplo são só ilustrativos.',
  'material.name': 'Nome',
  'material.id': 'ID',
  'material.uom': 'Unidade de medida',
  'material.listPrice': 'Preço de lista',
  'material.lastPurchase': 'Último preço de compra',
  'material.reorder': 'Ponto de reposição',
  'material.empty': 'Nenhum material cadastrado ainda. Crie um acima.',
  'material.createTitle': 'Cadastrar material',
  'material.editTitle': 'Editar material',
  'material.add': 'Adicionar material',
  'material.create': 'Salvar material',
  'material.saving': 'Salvando…',
  'material.catalog': 'Seus materiais',
  'material.namePlaceholder': 'ex.: Manteiga de cacau, Fio de algodão, Açúcar…',
  'material.lookupTitle': 'Busca externa de produto',
  'material.lookupLead':
    'Busca opcional no Open Food Facts. Sugestões são apenas consultivas.',
  'material.searchTerms': 'Termos de busca',
  'material.search': 'Buscar no Open Food Facts',
  'material.searching': 'Buscando…',
  'material.suggestions': 'Sugestões',
  'material.brand': 'Marca',
  'material.qtyLabel': 'Qtd. rótulo',
  'material.barcode': 'Código de barras',
  'recipe.title': 'Receitas',
  'recipe.lead':
    'Monte uma fórmula com seus materiais — padaria, confeitaria, artesanato, cosméticos ou qualquer produção em pequena escala.',
  'recipe.empty': 'Nenhuma receita cadastrada ainda. Crie uma acima.',
  'recipe.zeroCost': 'Mostrar caso de custo zero (DEC-16)',
  'recipe.yield': 'Rendimento',
  'recipe.targetMargin': 'Margem alvo',
  'recipe.fgSku': 'SKU acabado',
  'recipe.costStack': 'Pilha de custo / números do motor',
  'recipe.costMethod': 'Método de custo',
  'recipe.totalMaterial': 'Custo total de materiais',
  'recipe.unitCost': 'Custo unitário',
  'recipe.recommended': 'Preço de venda recomendado',
  'recipe.createTitle': 'Criar receita',
  'recipe.editTitle': 'Editar receita',
  'recipe.add': 'Adicionar receita',
  'recipe.create': 'Salvar receita',
  'recipe.saving': 'Salvando…',
  'recipe.catalog': 'Suas receitas',
  'recipe.namePlaceholder': 'ex.: Trufa de chocolate, Blend de vela…',
  'recipe.lines': 'Ingredientes dos seus materiais',
  'recipe.material': 'Material',
  'recipe.lineQty': 'Quantidade',
  'recipe.addLine': 'Adicionar linha',
  'recipe.removeLine': 'Remover',
  'recipe.selectMaterial': 'Selecione um material…',
  'recipe.qtyPositive': 'A quantidade de cada linha deve ser maior que zero.',
  'recipe.needMaterials':
    'Cadastre pelo menos um material antes de criar uma receita.',
  'recipe.stockAlertTitle': 'Alerta de estoque',
  'recipe.stockAlertBody':
    '“{name}” não está disponível em estoque (em mãos: {qty}). Você ainda pode incluir na receita; reponha o estoque antes da produção.',
  'recipe.stockAlertHint':
    'Este aviso é consultivo — o salvamento da receita não é bloqueado.',
  'recipe.stockMissing': 'sem linha de estoque',
  'inventory.title': 'Estoque',
  'inventory.lead':
    'Saldos em mãos. Alterações exigem proposta HITL e aprovação humana.',
  'inventory.onHand': 'Em mãos',
  'inventory.type': 'Tipo',
  'inventory.type.RM': 'Matéria-prima',
  'inventory.type.FG': 'Produto acabado',
  'inventory.sku': 'SKU',
  'inventory.reorderCol': 'Reposição',
  'inventory.unitCost': 'Custo unitário',
  'inventory.proposeAdjust': 'Propor ajuste manual',
  'inventory.delta': 'Variação',
  'inventory.reason': 'Motivo',
  'inventory.empty': 'Ainda não há linhas de estoque.',
  'inventory.adjust': 'Ajustar',
  'orders.title': 'Pedidos',
  'orders.lead':
    'Fluxo em três estados: pendente → em andamento → concluído. Cada passo precisa de HITL.',
  'orders.empty': 'Ainda não há pedidos. Crie um com o botão acima.',
  'orders.qty': 'Qtd',
  'orders.sellPrice': 'Preço de venda',
  'orders.status': 'Status',
  'orders.status.pending': 'Pendente',
  'orders.status.in_progress': 'Em andamento',
  'orders.status.completed': 'Concluído',
  'orders.actions': 'Ações',
  'orders.proposeCreate': 'Novo pedido',
  'orders.proposeProduce': 'Propor produção',
  'orders.proposeShip': 'Propor envio',
  'orders.quantityFg': 'Quantidade (unidades PA)',
  'orders.createTitle': 'Criar pedido',
  'orders.product': 'Produto',
  'orders.selectProduct': 'Selecione um produto…',
  'orders.needProduct':
    'Crie uma receita com SKU acabado antes de fazer um pedido.',
  'orders.uom': 'Unidades',
  'orders.payment': 'Pagamento',
  'orders.payment.cash': 'Dinheiro',
  'orders.payment.card': 'Cartão',
  'orders.payment.pix': 'PIX',
  'orders.payment.bank_transfer': 'Transferência',
  'orders.payment.other': 'Outro',
  'orders.notes': 'Observações',
  'orders.notesPlaceholder': 'Nota opcional do cliente ou entrega',
  'orders.priceHint': 'Recomendado se vazio',
  'orders.suggestedPrice': 'Preço sugerido',
  'hitl.title': 'Humano no loop',
  'hitl.lead':
    'Propostas de escrita ficam aqui. Aprovar executa; rejeitar mantém os dados.',
  'hitl.none': 'Nenhuma aprovação pendente.',
  'hitl.feedback': 'Feedback (obrigatório para rejeitar)',
  'hitl.feedbackPlaceholder': 'Nota opcional ao aprovar; obrigatória ao rejeitar',
  'hitl.rejectNeedsFeedback': 'Rejeitar exige feedback explicando o motivo.',
  'copilot.title': 'Copiloto de custeio',
  'copilot.lead':
    'Chat não streaming (CrewAI). Explica números do motor — o agente não inventa valores.',
  'copilot.message': 'Mensagem',
  'copilot.ask': 'Perguntar ao analista de custeio',
  'copilot.asking': 'Perguntando…',
  'copilot.agent': 'Agente',
  'copilot.grounding': 'Fundamento',
  'copilot.artifacts': 'Planejamento e raciocínio',
  'copilot.crewPlan': 'Plano da crew',
  'copilot.agentReasoning': 'Raciocínio do agente',
}

const es: Record<MessageKey, string> = {
  ...en,
  'app.tagline': 'Costeo para makers de cualquier oficio',
  'nav.section': 'Espacio de trabajo',
  'nav.dashboard': 'Panel',
  'nav.materials': 'Materiales',
  'nav.recipes': 'Recetas',
  'nav.inventory': 'Inventario',
  'nav.orders': 'Pedidos',
  'nav.deferred': 'Aplazado',
  'nav.suppliers': 'Proveedores',
  'nav.customers': 'Clientes',
  'nav.purchases': 'Compras',
  'nav.reports': 'Informes',
  'prefs.theme': 'Tema',
  'prefs.theme.light': 'Claro',
  'prefs.theme.dark': 'Oscuro',
  'prefs.theme.system': 'Sistema',
  'prefs.language': 'Idioma',
  'prefs.account': 'Menú de cuenta',
  'prefs.owner': 'Propietario',
  'prefs.close': 'Cerrar',
  'banner.currency': 'Moneda',
  'banner.live': 'API en vivo',
  'banner.mock': 'datos de demostración (defina VITE_API_BASE_URL para la API en vivo)',
  'common.loading': 'Cargando…',
  'common.error': 'Algo salió mal',
  'common.refresh': 'Actualizar',
  'common.submitApproval': 'Enviar para aprobación',
  'common.approve': 'Aprobar',
  'common.reject': 'Rechazar',
  'common.done': 'Hecho',
  'common.edit': 'Editar',
  'common.actions': 'Acciones',
  'common.cancel': 'Cancelar',
  'uom.kg': 'kg',
  'uom.g': 'g',
  'uom.L': 'L',
  'uom.ml': 'ml',
  'uom.unit': 'unidad',
  'uom.pack': 'paquete',
  'demo.flour': 'Harina',
  'demo.bread': 'Pan simple',
  'cost.method.list_price': 'Precio de lista',
  'cost.method.weighted_avg': 'Promedio ponderado',
  'cost.method.last_purchase': 'Última compra',
  'cost.zeroLabel': 'n/d / costo cero',
  'pager.label': 'Paginación',
  'pager.perPage': 'Filas',
  'pager.range': '{start}–{end} de {total}',
  'pager.empty': 'Sin filas',
  'pager.prev': 'Anterior',
  'pager.next': 'Siguiente',
  'pager.page': 'Página {page} / {pages}',
  'future.work': 'Trabajo futuro',
  'dashboard.title': 'Panel',
  'dashboard.lead':
    'Vista histórica de ingresos, costos, márgenes, stock bajo y pipeline de pedidos.',
  'dashboard.period': 'Período: todo el historial',
  'dashboard.revenue': 'Ingresos',
  'dashboard.cogs': 'COGS',
  'dashboard.profit': 'Beneficio',
  'dashboard.margin': 'Margen',
  'dashboard.lowStock': 'Stock bajo',
  'dashboard.pipeline': 'Pipeline de pedidos',
  'dashboard.pending': 'Pendiente',
  'dashboard.inProgress': 'En progreso',
  'dashboard.completed': 'Completado',
  'dashboard.topProducts': 'Productos por beneficio',
  'dashboard.empty':
    'Aún no hay ventas completadas. Cree y envíe un pedido para ver totales.',
  'dashboard.alerts': 'Alertas de stock bajo',
  'material.title': 'Materiales',
  'material.lead':
    'Registre cualquier insumo — harina, chocolate, base de jabón, tela, embalaje — con su unidad. Los datos de ejemplo son solo ilustrativos.',
  'material.name': 'Nombre',
  'material.id': 'ID',
  'material.uom': 'Unidad de medida',
  'material.listPrice': 'Precio de lista',
  'material.lastPurchase': 'Último precio de compra',
  'material.reorder': 'Punto de reposición',
  'material.empty': 'Aún no hay material registrado. Cree uno arriba.',
  'material.createTitle': 'Registrar material',
  'material.editTitle': 'Editar material',
  'material.add': 'Añadir material',
  'material.create': 'Guardar material',
  'material.saving': 'Guardando…',
  'material.catalog': 'Sus materiales',
  'material.namePlaceholder': 'ej.: Manteca de cacao, Hilo de algodón, Azúcar…',
  'material.lookupTitle': 'Búsqueda externa de producto',
  'material.lookupLead':
    'Búsqueda opcional en Open Food Facts. Las sugerencias son solo consultivas.',
  'material.searchTerms': 'Términos de búsqueda',
  'material.search': 'Buscar en Open Food Facts',
  'material.searching': 'Buscando…',
  'material.suggestions': 'Sugerencias',
  'material.brand': 'Marca',
  'material.qtyLabel': 'Etiqueta de cant.',
  'material.barcode': 'Código de barras',
  'recipe.title': 'Recetas',
  'recipe.lead':
    'Arme una fórmula con sus materiales — panadería, confitería, artesanía, cosmética o cualquier producción a pequeña escala.',
  'recipe.empty': 'Aún no hay receta registrada. Cree una arriba.',
  'recipe.zeroCost': 'Mostrar caso de costo cero (DEC-16)',
  'recipe.yield': 'Rendimiento',
  'recipe.targetMargin': 'Margen objetivo',
  'recipe.fgSku': 'SKU terminado',
  'recipe.costStack': 'Pila de costos / cifras del motor',
  'recipe.costMethod': 'Método de costo',
  'recipe.totalMaterial': 'Costo total de materiales',
  'recipe.unitCost': 'Costo unitario',
  'recipe.recommended': 'Precio de venta recomendado',
  'recipe.createTitle': 'Crear receta',
  'recipe.editTitle': 'Editar receta',
  'recipe.add': 'Añadir receta',
  'recipe.create': 'Guardar receta',
  'recipe.saving': 'Guardando…',
  'recipe.catalog': 'Sus recetas',
  'recipe.namePlaceholder': 'ej.: Trufa de chocolate, Blend de vela…',
  'recipe.lines': 'Ingredientes de sus materiales',
  'recipe.material': 'Material',
  'recipe.lineQty': 'Cantidad',
  'recipe.addLine': 'Agregar línea',
  'recipe.removeLine': 'Quitar',
  'recipe.selectMaterial': 'Seleccione un material…',
  'recipe.qtyPositive': 'La cantidad de cada línea debe ser mayor que cero.',
  'recipe.needMaterials':
    'Registre al menos un material antes de crear una receta.',
  'recipe.stockAlertTitle': 'Alerta de stock',
  'recipe.stockAlertBody':
    '“{name}” no está disponible en stock (disponible: {qty}). Aún puede incluirlo en la receta; reabastezca antes de producir.',
  'recipe.stockAlertHint':
    'Esta advertencia es consultiva — no bloquea guardar la receta.',
  'recipe.stockMissing': 'sin fila de stock',
  'inventory.title': 'Inventario',
  'inventory.lead':
    'Saldos disponibles. Los cambios requieren propuesta HITL y aprobación humana.',
  'inventory.onHand': 'Disponible',
  'inventory.type': 'Tipo',
  'inventory.type.RM': 'Materia prima',
  'inventory.type.FG': 'Producto terminado',
  'inventory.sku': 'SKU',
  'inventory.reorderCol': 'Reposición',
  'inventory.unitCost': 'Costo unitario',
  'inventory.proposeAdjust': 'Proponer ajuste manual',
  'inventory.delta': 'Variación',
  'inventory.reason': 'Motivo',
  'inventory.empty': 'Aún no hay filas de inventario.',
  'inventory.adjust': 'Ajustar',
  'orders.title': 'Pedidos',
  'orders.lead':
    'Flujo de tres estados: pendiente → en progreso → completado. Cada paso necesita HITL.',
  'orders.empty': 'Aún no hay pedidos. Cree uno con Nuevo pedido.',
  'orders.qty': 'Cant.',
  'orders.sellPrice': 'Precio de venta',
  'orders.status': 'Estado',
  'orders.status.pending': 'Pendiente',
  'orders.status.in_progress': 'En progreso',
  'orders.status.completed': 'Completado',
  'orders.actions': 'Acciones',
  'orders.proposeCreate': 'Nuevo pedido',
  'orders.proposeProduce': 'Proponer producción',
  'orders.proposeShip': 'Proponer envío',
  'orders.quantityFg': 'Cantidad (unidades PT)',
  'orders.createTitle': 'Crear pedido',
  'orders.product': 'Producto',
  'orders.selectProduct': 'Seleccione un producto…',
  'orders.needProduct':
    'Cree una receta con SKU terminado antes de registrar un pedido.',
  'orders.uom': 'Unidad',
  'orders.payment': 'Pago',
  'orders.payment.cash': 'Efectivo',
  'orders.payment.card': 'Tarjeta',
  'orders.payment.pix': 'Pix',
  'orders.payment.bank_transfer': 'Transferencia',
  'orders.payment.other': 'Otro',
  'orders.notes': 'Notas',
  'orders.notesPlaceholder': 'Nota opcional del cliente o entrega',
  'orders.priceHint': 'Recomendado si está vacío',
  'orders.suggestedPrice': 'Precio de venta sugerido',
  'hitl.title': 'Humano en el ciclo',
  'hitl.lead':
    'Las propuestas de escritura esperan aquí. Aprobar ejecuta; rechazar no cambia datos.',
  'hitl.none': 'No hay aprobaciones pendientes.',
  'hitl.feedback': 'Comentario (obligatorio para rechazar)',
  'hitl.feedbackPlaceholder':
    'Nota opcional al aprobar; obligatoria al rechazar',
  'hitl.rejectNeedsFeedback': 'Rechazar requiere un comentario que explique por qué.',
  'copilot.title': 'Copiloto de costeo',
  'copilot.lead':
    'Chat sin streaming (CrewAI). Explica cifras del motor — el agente no inventa números.',
  'copilot.message': 'Mensaje',
  'copilot.ask': 'Preguntar al analista de costeo',
  'copilot.asking': 'Preguntando…',
  'copilot.agent': 'Agente',
  'copilot.grounding': 'Fundamento',
  'copilot.artifacts': 'Planificación y razonamiento',
  'copilot.crewPlan': 'Plan del crew',
  'copilot.agentReasoning': 'Razonamiento del agente',
}

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en,
  pt,
  es,
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  pt: 'PT',
  es: 'ES',
}

export function localeToBcp47(locale: Locale): string {
  if (locale === 'pt') return 'pt-BR'
  if (locale === 'es') return 'es-ES'
  return 'en-US'
}
