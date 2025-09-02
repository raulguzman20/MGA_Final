const mongoose = require('mongoose');
const Rol = require('../models/rol');
const Permiso = require('../models/Permiso');
const Privilegio = require('../models/Privilegio');
const RolPermisoPrivilegio = require('../models/RolPermisoPrivilegio');

// Configuración de la conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teacuerdas';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Conexión a MongoDB establecida');
  setupDefaultPermissions();
}).catch(err => {
  console.error('Error conectando a MongoDB:', err);
  process.exit(1);
});

async function setupDefaultPermissions() {
  try {
    console.log('Configurando permisos por defecto...');

    // Definir permisos base
    const permisos = [
      // Dashboards específicos
      { permiso: 'dashboard-administrador' },
      { permiso: 'dashboard-profesor' },
      { permiso: 'dashboard-beneficiario' },
      { permiso: 'dashboard' },
      // Configuración
      { permiso: 'configuracion-usuarios' },
      { permiso: 'configuracion-roles' },
      // Servicios musicales
      { permiso: 'servicios-musicales-profesores' },
      { permiso: 'servicios-musicales-programacion-profesores' },
      { permiso: 'servicios-musicales-programacion-clases' },
      { permiso: 'servicios-musicales-cursos-matriculas' },
      { permiso: 'servicios-musicales-aulas' },
      { permiso: 'servicios-musicales-clases' },
      // Venta de servicios
      { permiso: 'venta-servicios-clientes' },
      { permiso: 'venta-servicios-beneficiarios' },
      { permiso: 'venta-servicios-estudiantes' },
      { permiso: 'venta-servicios-venta-cursos' },
      { permiso: 'venta-servicios-venta-matriculas' },
      { permiso: 'venta-servicios-asistencia' },
      { permiso: 'venta-servicios-pagos' }
    ];

    // Definir privilegios base
    const privilegios = [
      { nombre_privilegio: 'ver' },
      { nombre_privilegio: 'crear' },
      { nombre_privilegio: 'editar' },
      { nombre_privilegio: 'eliminar' }
    ];

    // Crear permisos si no existen
    for (const permisoData of permisos) {
      const existingPermiso = await Permiso.findOne({ permiso: permisoData.permiso });
      if (!existingPermiso) {
        await Permiso.create(permisoData);
        console.log(`Permiso creado: ${permisoData.permiso}`);
      }
    }

    // Crear privilegios si no existen
    for (const privilegioData of privilegios) {
      const existingPrivilegio = await Privilegio.findOne({ nombre_privilegio: privilegioData.nombre_privilegio });
      if (!existingPrivilegio) {
        await Privilegio.create(privilegioData);
        console.log(`Privilegio creado: ${privilegioData.nombre_privilegio}`);
      }
    }

    // Obtener IDs de roles, permisos y privilegios
    const roles = await Rol.find();
    const permisosDB = await Permiso.find();
    const privilegiosDB = await Privilegio.find();

    const rolAdministrador = roles.find(r => r.nombre.toLowerCase() === 'administrador');
    const rolSecretaria = roles.find(r => r.nombre.toLowerCase() === 'secretaria');
    const rolProfesor = roles.find(r => r.nombre.toLowerCase() === 'profesor');
    const rolBeneficiario = roles.find(r => r.nombre.toLowerCase() === 'beneficiario');
    const privilegioVer = privilegiosDB.find(p => p.nombre_privilegio === 'ver');
    const privilegioCrear = privilegiosDB.find(p => p.nombre_privilegio === 'crear');
    const privilegioEditar = privilegiosDB.find(p => p.nombre_privilegio === 'editar');
    const privilegioEliminar = privilegiosDB.find(p => p.nombre_privilegio === 'eliminar');

    // Crear roles si no existen
    if (!rolAdministrador) {
      console.log('Creando rol Administrador...');
      const nuevoRolAdministrador = await Rol.create({
        nombre: 'Administrador',
        descripcion: 'Rol para administradores del sistema'
      });
      console.log('Rol Administrador creado:', nuevoRolAdministrador._id);
    }

    if (!rolSecretaria) {
      console.log('Creando rol Secretaria...');
      const nuevoRolSecretaria = await Rol.create({
        nombre: 'Secretaria',
        descripcion: 'Rol para secretarias del sistema'
      });
      console.log('Rol Secretaria creado:', nuevoRolSecretaria._id);
    }

    if (!rolProfesor) {
      console.log('Creando rol Profesor...');
      const nuevoRolProfesor = await Rol.create({
        nombre: 'Profesor',
        descripcion: 'Rol para profesores del sistema'
      });
      console.log('Rol Profesor creado:', nuevoRolProfesor._id);
    }

    if (!rolBeneficiario) {
      console.log('Creando rol Beneficiario...');
      const nuevoRolBeneficiario = await Rol.create({
        nombre: 'Beneficiario',
        descripcion: 'Rol para beneficiarios del sistema'
      });
      console.log('Rol Beneficiario creado:', nuevoRolBeneficiario._id);
    }

    // Actualizar referencias después de crear roles
    const rolesActualizados = await Rol.find();
    const administradorRole = rolesActualizados.find(r => r.nombre.toLowerCase() === 'administrador');
    const secretariaRole = rolesActualizados.find(r => r.nombre.toLowerCase() === 'secretaria');
    const profesorRole = rolesActualizados.find(r => r.nombre.toLowerCase() === 'profesor');
    const beneficiarioRole = rolesActualizados.find(r => r.nombre.toLowerCase() === 'beneficiario');

    // Función auxiliar para asignar permisos
    async function asignarPermiso(role, permisoNombre, privilegio) {
      const permiso = permisosDB.find(p => p.permiso === permisoNombre);
      if (permiso && role) {
        const existingRelation = await RolPermisoPrivilegio.findOne({
          rolId: role._id,
          permisoId: permiso._id,
          privilegioId: privilegio._id
        });

        if (!existingRelation) {
          await RolPermisoPrivilegio.create({
            rolId: role._id,
            permisoId: permiso._id,
            privilegioId: privilegio._id
          });
          console.log(`Permiso asignado a ${role.nombre}: ${permisoNombre} - ${privilegio.nombre_privilegio}`);
        }
      }
    }

    // Configurar permisos para ADMINISTRADOR (acceso completo)
    if (administradorRole) {
      const permisosAdministrador = [
        'dashboard-administrador',
        'dashboard',
        'configuracion-usuarios',
        'configuracion-roles',
        'servicios-musicales-profesores',
        'servicios-musicales-programacion-profesores',
        'servicios-musicales-programacion-clases',
        'servicios-musicales-cursos-matriculas',
        'servicios-musicales-aulas',
        'servicios-musicales-clases',
        'venta-servicios-clientes',
        'venta-servicios-beneficiarios',
        'venta-servicios-estudiantes',
        'venta-servicios-venta-cursos',
        'venta-servicios-venta-matriculas',
        'venta-servicios-asistencia',
        'venta-servicios-pagos'
      ];

      for (const permisoNombre of permisosAdministrador) {
        await asignarPermiso(administradorRole, permisoNombre, privilegioVer);
        await asignarPermiso(administradorRole, permisoNombre, privilegioCrear);
        await asignarPermiso(administradorRole, permisoNombre, privilegioEditar);
        await asignarPermiso(administradorRole, permisoNombre, privilegioEliminar);
      }
    }

    // Configurar permisos para SECRETARIA
    if (secretariaRole) {
      const permisosSecretaria = [
        'dashboard-administrador',
        'dashboard',
        'servicios-musicales-profesores',
        'servicios-musicales-programacion-profesores',
        'servicios-musicales-programacion-clases',
        'servicios-musicales-cursos-matriculas',
        'servicios-musicales-aulas',
        'servicios-musicales-clases',
        'venta-servicios-clientes',
        'venta-servicios-beneficiarios',
        'venta-servicios-estudiantes',
        'venta-servicios-venta-cursos',
        'venta-servicios-venta-matriculas',
        'venta-servicios-asistencia',
        'venta-servicios-pagos'
      ];

      for (const permisoNombre of permisosSecretaria) {
        await asignarPermiso(secretariaRole, permisoNombre, privilegioVer);
        await asignarPermiso(secretariaRole, permisoNombre, privilegioCrear);
        await asignarPermiso(secretariaRole, permisoNombre, privilegioEditar);
      }
    }

    // Configurar permisos para PROFESOR
    if (profesorRole) {
      const permisosProfesores = [
        'dashboard-profesor',
        'dashboard',
        'servicios-musicales-programacion-profesores',
        'servicios-musicales-programacion-clases',
        'venta-servicios-asistencia'
      ];

      for (const permisoNombre of permisosProfesores) {
        const permiso = permisosDB.find(p => p.permiso === permisoNombre);
        if (permiso) {
          // Verificar si ya existe la relación
          const existingRelation = await RolPermisoPrivilegio.findOne({
            rolId: profesorRole._id,
            permisoId: permiso._id,
            privilegioId: privilegioVer._id
          });

          if (!existingRelation) {
            await RolPermisoPrivilegio.create({
              rolId: profesorRole._id,
              permisoId: permiso._id,
              privilegioId: privilegioVer._id
            });
            console.log(`Permiso asignado a Profesor: ${permisoNombre} - ver`);
          }

          // Para algunos permisos, también dar privilegios de crear/editar
          if (['servicios-musicales-programacion-profesores', 'venta-servicios-asistencia'].includes(permisoNombre)) {
            const existingCrear = await RolPermisoPrivilegio.findOne({
              rolId: profesorRole._id,
              permisoId: permiso._id,
              privilegioId: privilegioCrear._id
            });

            if (!existingCrear) {
              await RolPermisoPrivilegio.create({
                rolId: profesorRole._id,
                permisoId: permiso._id,
                privilegioId: privilegioCrear._id
              });
              console.log(`Permiso asignado a Profesor: ${permisoNombre} - crear`);
            }

            const existingEditar = await RolPermisoPrivilegio.findOne({
              rolId: profesorRole._id,
              permisoId: permiso._id,
              privilegioId: privilegioEditar._id
            });

            if (!existingEditar) {
              await RolPermisoPrivilegio.create({
                rolId: profesorRole._id,
                permisoId: permiso._id,
                privilegioId: privilegioEditar._id
              });
              console.log(`Permiso asignado a Profesor: ${permisoNombre} - editar`);
            }
          }
        }
      }
    }

    // Configurar permisos para BENEFICIARIO
    if (beneficiarioRole) {
      const permisosBeneficiarios = [
        'dashboard-beneficiario',
        'dashboard',
        'servicios-musicales-programacion-clases',
        'venta-servicios-pagos'
      ];

      for (const permisoNombre of permisosBeneficiarios) {
        const permiso = permisosDB.find(p => p.permiso === permisoNombre);
        if (permiso) {
          // Verificar si ya existe la relación
          const existingRelation = await RolPermisoPrivilegio.findOne({
            rolId: beneficiarioRole._id,
            permisoId: permiso._id,
            privilegioId: privilegioVer._id
          });

          if (!existingRelation) {
            await RolPermisoPrivilegio.create({
              rolId: beneficiarioRole._id,
              permisoId: permiso._id,
              privilegioId: privilegioVer._id
            });
            console.log(`Permiso asignado a Beneficiario: ${permisoNombre} - ver`);
          }

          // Para pagos, también dar privilegio de crear
          if (permisoNombre === 'venta-servicios-pagos') {
            const existingCrear = await RolPermisoPrivilegio.findOne({
              rolId: beneficiarioRole._id,
              permisoId: permiso._id,
              privilegioId: privilegioCrear._id
            });

            if (!existingCrear) {
              await RolPermisoPrivilegio.create({
                rolId: beneficiarioRole._id,
                permisoId: permiso._id,
                privilegioId: privilegioCrear._id
              });
              console.log(`Permiso asignado a Beneficiario: ${permisoNombre} - crear`);
            }
          }
        }
      }
    }

    console.log('\n✅ Configuración de permisos por defecto completada exitosamente!');
    console.log('\nPermisos configurados:');
    console.log('🔧 ADMINISTRADOR:');
    console.log('  - Acceso completo a todos los módulos (ver, crear, editar, eliminar)');
    console.log('\n📋 SECRETARIA:');
    console.log('  - Dashboard (ver, crear, editar)');
    console.log('  - Servicios Musicales (ver, crear, editar)');
    console.log('  - Venta de Servicios (ver, crear, editar)');
    console.log('\n📚 PROFESOR:');
    console.log('  - Dashboard (ver)');
    console.log('  - Programación de Profesores (ver, crear, editar)');
    console.log('  - Programación de Clases (ver)');
    console.log('  - Asistencia (ver, crear, editar)');
    console.log('\n👥 BENEFICIARIO:');
    console.log('  - Dashboard (ver)');
    console.log('  - Programación de Clases (ver)');
    console.log('  - Pagos (ver, crear)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error configurando permisos por defecto:', error);
    process.exit(1);
  }
}