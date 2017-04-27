#!groovy

node {

           stage('Checkout'){
                checkout scm
                sh 'git checkout -b golang-docker'
                sh 'git pull'
            }



            stage('Build Server') {
                // Export environment variables pointing to the directory where Go was installed
                docker.image('golang:1.8.1').inside {
                     sh 'echo $GOPATH'
                     sh 'echo $GOROOT'
                     sh 'ls -la'
                     sh 'ls -la src/github.com'
                     sh 'ls -la src/github.com/reportportal'
                     sh 'make build-server'
                }
            }

}

