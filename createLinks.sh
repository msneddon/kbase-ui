cd build/build/client/modules/plugins/catalog/
rm -rf modules
rm -rf resources
ln -s ../../../../../../src/client/modules/plugins/catalog/modules/ ./
ln -s ../../../../../../src/client/modules/plugins/catalog/resources/ ./
cd -