FROM ubuntu:latest

MAINTAINER Dan Pupius <dan@pupi.us>

RUN apt-get update
RUN apt-get -y upgrade

# Install apache, PHP, and supplimentary programs. curl and lynx-cur are for debugging the container.
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install apache2 libapache2-mod-php5 php5-mysql php5-gd php-pear php-apc curl lynx-cur

# Enable mod_php that we just installed.
RUN a2enmod php5

# Update the PHP.ini file, enable <? ?> tags.
RUN sed -i "s/short_open_tag = Off/short_open_tag = On/" /etc/php5/apache2/php.ini

# Manually set up the apache environment variables
ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data
ENV APACHE_LOG_DIR /var/log/apache2
ENV APACHE_LOCK_DIR /var/lock/apache2
ENV APACHE_PID_FILE /var/run/apache2.pid

EXPOSE 80

# Copy this repo into place.
ADD www /var/www/site

# Update the default apache site with the config we created.
ADD apache-config.conf /etc/apache2/sites-enabled/000-default.conf
