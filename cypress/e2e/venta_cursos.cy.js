describe('Módulo Venta de Cursos', () => {
  beforeEach(() => {
    // Interceptar las llamadas a la API para mejorar la estabilidad de las pruebas
    cy.intercept('GET', '**/api/beneficiarios*').as('getBeneficiarios');
    cy.intercept('GET', '**/api/cursos*').as('getCursos');
    cy.intercept('GET', '**/api/ventas/next-consecutivo').as('getConsecutivo');
    cy.intercept('POST', '**/api/ventas').as('createVenta');
    cy.intercept('GET', '**/api/ventas').as('getVentas');
    
    // Login previo en beforeEach para evitar repetición
    cy.visit('http://localhost:5173');
    cy.get('input[type="email"]', { timeout: 45000 }).should('be.visible').type('raulguzmaz1023@gmail.com');
    cy.get('input[type="password"]').type('raul444');
    cy.contains('INICIAR SESIÓN').click();
    
    cy.wait(30000);

    // Esperar a que complete el login y navegar a la página
    cy.url({ timeout: 45000 }).should('not.include', 'login');
    cy.visit('http://localhost:5173/venta-servicios/venta-cursos');
    
    cy.wait(30000);

    // Esperar a que cargue la página de ventas
    cy.wait('@getVentas', { timeout: 45000 });
    cy.contains('Venta de Cursos', { timeout: 45000 }).should('be.visible');
  });

    
  it('Debe crear una venta válida', () => {
    // Buscar el botón de crear usando un selector más específico basado en el código
    cy.get('[data-testid="create-button"], button').contains('Crear').click();
    
    // Verificar que el modal se abrió
    cy.contains('Crear Venta de Curso', { timeout: 25000 }).should('be.visible');
    
    // Esperar a que carguen los datos iniciales
    cy.wait(['@getBeneficiarios', '@getCursos', '@getConsecutivo'], { timeout: 35000 });
    
    // Seleccionar beneficiario usando el componente Autocomplete de Material-UI
    cy.get('input[placeholder*="beneficiario"], label').contains('Beneficiario').parent()
      .find('input').first().click().type('Juan{downArrow}{enter}', { delay: 100 });
    
    // Esperar un momento para que se cargue la información del cliente
    cy.wait(3000);
    
    // Seleccionar curso
    cy.get('label').contains('Curso').parent()
      .find('input').first().click().type('Guitarra{downArrow}{enter}', { delay: 100 });
    
    // Esperar a que se calcule el valor por hora
    cy.wait(2000);
    
    // Ingresar número de clases
    cy.get('label').contains('Número de Clases').parent().find('input[type="number"]')
      .clear().type('10');
    
    // Esperar a que se calcule el valor total
    cy.wait(2000);
    
    // Manejar las fechas usando el DatePicker de Material-UI
    // Para la fecha de inicio, usaremos la fecha actual
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Buscar el campo de fecha por su label y usar setValue para evitar problemas del DatePicker
    cy.get('label').contains('Fecha Inicio').parent().find('input')
      .clear().type(todayFormatted);
    
    // Verificar que la fecha fin se estableció automáticamente
    cy.get('label').contains('Fecha Fin').parent().find('input')
      .should('not.have.value', '');

    
    // Hacer clic en crear venta
    cy.contains('button', 'Crear Venta').should('be.enabled').click();
    cy.wait(30000);
    // Esperar a que se complete la creación
    cy.wait('@createVenta', { timeout: 45000 });
        
    // Verificar que se actualiza la tabla
    cy.wait('@getVentas', { timeout: 25000 });
    cy.get('table, .MuiDataGrid-root').should('be.visible');
  });
  
  it('Debe mostrar error al intentar crear una venta sin beneficiario', () => {
    // Abrir modal de creación
    cy.get('button').contains('Crear').click();
    
    // Verificar que el modal se abrió
    cy.contains('Crear Venta de Curso', { timeout: 25000 }).should('be.visible');
    
    // Esperar a que carguen los datos
    cy.wait(['@getBeneficiarios', '@getCursos', '@getConsecutivo'], { timeout: 35000 });
    
    // Intentar crear sin seleccionar beneficiario
    cy.contains('button', 'Crear Venta').click();
    
    // Verificar mensaje de error específico del componente
    cy.contains('Debe seleccionar un beneficiario', { timeout: 25000 }).should('be.visible');
    
    // Verificar que el modal sigue abierto
    cy.contains('Crear Venta de Curso').should('be.visible');
  });
  
  it('Debe mostrar error al intentar crear una venta sin curso', () => {
    // Abrir modal de creación
    cy.get('button').contains('Crear').click();
    
    // Verificar que el modal se abrió
    cy.contains('Crear Venta de Curso', { timeout: 25000 }).should('be.visible');
    
    // Esperar a que carguen los datos
    cy.wait(['@getBeneficiarios', '@getCursos', '@getConsecutivo'], { timeout: 35000 });
    
    // Seleccionar solo beneficiario
    cy.get('label').contains('Beneficiario').parent()
      .find('input').first().click().type('Juan{downArrow}{enter}', { delay: 100 });
    
    // Intentar crear sin curso
    cy.contains('button', 'Crear Venta').click();
    
    // Verificar mensaje de error
    cy.contains('Debe seleccionar un curso', { timeout: 25000 }).should('be.visible');
  });
  
  it('Debe mostrar error con número de clases inválido', () => {
    // Abrir modal de creación
    cy.get('button').contains('Crear').click();
    
    // Verificar que el modal se abrió
    cy.contains('Crear Venta de Curso', { timeout: 25000 }).should('be.visible');
    
    // Esperar a que carguen los datos
    cy.wait(['@getBeneficiarios', '@getCursos', '@getConsecutivo'], { timeout: 35000 });
    
    // Seleccionar beneficiario y curso
    cy.get('label').contains('Beneficiario').parent()
      .find('input').first().click().type('Juan{downArrow}{enter}', { delay: 100 });
    
    cy.get('label').contains('Curso').parent()
      .find('input').first().click().type('Guitarra{downArrow}{enter}', { delay: 100 });
    
    // Ingresar número de clases inválido (mayor a 720)
    cy.get('label').contains('Número de Clases').parent().find('input[type="number"]')
      .clear().type('800');
    
    // Intentar crear venta
    cy.contains('button', 'Crear Venta').click();
    
    // Verificar mensaje de error
    cy.contains('Debe ingresar un número válido de clases', { timeout: 25000 }).should('be.visible');
  });
  
  it('Debe cancelar la creación de venta', () => {
    // Abrir modal de creación
    cy.get('button').contains('Crear').click();
    
    // Verificar que el modal se abrió
    cy.contains('Crear Venta de Curso', { timeout: 25000 }).should('be.visible');
    
    // Hacer clic en cancelar
    cy.contains('button', 'Cancelar').click();
    
    // Verificar que el modal se cerró
    cy.contains('Crear Venta de Curso').should('not.exist');
    
    // Verificar que seguimos en la página principal
    cy.contains('Venta de Cursos').should('be.visible');
  });
  
  it('Debe mostrar detalles de una venta existente', () => {
    // Esperar a que cargue la tabla con datos
    cy.wait('@getVentas', { timeout: 30000 });
    
    // Buscar una fila en la tabla y hacer clic en el botón de ver detalles
    cy.get('table tbody tr, .MuiDataGrid-row').first().within(() => {
      cy.get('button[title*="Ver"], button').contains('Ver', { matchCase: false }).click();
    });
    
    // Verificar que se abre el modal de detalles
    cy.contains('Detalle de la Venta', { timeout: 25000 }).should('be.visible');
    
    // Verificar que se muestran los campos de detalle
    cy.contains('Beneficiario').should('be.visible');
    cy.contains('Curso').should('be.visible');
    cy.contains('Valor Total').should('be.visible');
    
    // Cerrar modal
    cy.get('button').contains('Cerrar', { matchCase: false }).click();
    
    // Verificar que el modal se cerró
    cy.contains('Detalle de la Venta').should('not.exist');
  });
});