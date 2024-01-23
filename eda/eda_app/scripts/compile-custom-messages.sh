#!/bin/bash

# Función para mostrar mensajes
mostrar_mensaje() {
    if [ $1 -eq 0 ]; then
        echo -e "\e[32mÉxito: $2\e[0m"
    else
        echo -e "\e[31mError: $2\e[0m"
    fi
}

# Ejecutar comandos y verificar si se ejecutan con éxito
xliff-simple-merge -i ./src/locale/stic_messages.es.xlf ./src/locale/messages.es.xlf -d ./src/locale/prod_messages.es.xlf -w
mostrar_mensaje $? "Procesamiento de stic_messages.es.xlf completado."

xliff-simple-merge -i ./src/locale/stic_messages.ca.xlf ./src/locale/messages.ca.xlf -d ./src/locale/prod_messages.ca.xlf -w
mostrar_mensaje $? "Procesamiento de stic_messages.ca.xlf completado."

xliff-simple-merge -i ./src/locale/stic_messages.en.xlf ./src/locale/messages.en.xlf -d ./src/locale/prod_messages.en.xlf -w
mostrar_mensaje $? "Procesamiento de stic_messages.en.xlf completado."

xliff-simple-merge -i ./src/locale/stic_messages.gl.xlf ./src/locale/messages.gl.xlf -d ./src/locale/prod_messages.gl.xlf -w
mostrar_mensaje $? "Procesamiento de stic_messages.gl.xlf completado."
